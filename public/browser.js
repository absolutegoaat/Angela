"use strict";

const { Controller } = $scramjetController;
const { defaultConfig } = $scramjet;

const DEFAULT_SEARCH = "https://www.duckduckgo.com/search?q=%s";
const PROXY_MARKER = "/~/sj/";

/** @type {{ tab: HTMLElement, iframe: HTMLIFrameElement, frame: object | null, history: string[], historyIndex: number }[]} */
const tabs = [];
let activeTabIndex = -1;

const tabContainer = document.getElementById("browser-tabs");
const contentArea = document.getElementById("browser-content");
const addressBar = document.getElementById("address-bar");
const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");
const btnRefresh = document.getElementById("btn-refresh");
const btnBackToMainSite = document.getElementById("btn-backtomainsite");

let controllerPromise = null;

function getController() {
	if (!controllerPromise) {
		controllerPromise = (async () => {
			await registerSW();

			const registration = await navigator.serviceWorker.ready;
			const serviceworker =
				navigator.serviceWorker.controller || registration.active;

			const wispUrl =
				(location.protocol === "https:" ? "wss" : "ws") +
				"://" +
				location.host +
				"/wisp/";

			const mod = await import("/libcurl/index.mjs");
			const LibcurlClient = mod.LibcurlClient ?? mod.default;
			const transport = new LibcurlClient({ wisp: wispUrl });
			await transport.init();

			const controller = new Controller({
				serviceworker,
				transport,
				scramjetConfig: defaultConfig,
			});
			await controller.wait();
			return controller;
		})();

		controllerPromise.catch((err) => {
			console.error("Scramjet setup failed:", err);
			controllerPromise = null; // allow a retry on the next navigation
		});
	}
	return controllerPromise;
}

async function ensureFrame(entry) {
	if (!entry.frame) {
		const controller = await getController();
		if (!entry.frame) entry.frame = controller.createFrame(entry.iframe);
	}
	return entry.frame;
}

function normalizeUrl(u) {
	try {
		return new URL(u).href;
	} catch (_) {
		return u;
	}
}

function setActiveTab(index) {
	if (index === activeTabIndex) return;

	if (activeTabIndex >= 0 && tabs[activeTabIndex]) {
		tabs[activeTabIndex].tab.classList.remove("active");
		tabs[activeTabIndex].iframe.style.display = "none";
	}

	activeTabIndex = index;
	const current = tabs[index];
	current.tab.classList.add("active");
	current.iframe.style.display = "block";

	addressBar.value = current.history[current.historyIndex] || "";
	updateNavButtons();
}

function updateNavButtons() {
	if (activeTabIndex < 0) return;

	const { history, historyIndex } = tabs[activeTabIndex];
	btnBack.disabled = historyIndex <= 0;
	btnForward.disabled = historyIndex >= history.length - 1;
}

function updateTabTitle(index, title, faviconUrl) {
	if (!tabs[index]) return;

	const tab = tabs[index].tab;
	const titleEl = tab.querySelector(".tab-title");
	const imgEl = tab.querySelector("img");
	if (titleEl && title) titleEl.textContent = title;
	if (imgEl && faviconUrl) imgEl.src = faviconUrl;
}

function createTab(url) {
	const tab = document.createElement("div");
	tab.classList.add("tab");
	tab.innerHTML = `
        <img src="/favicon.ico" alt="" />
        <span class="tab-title">New Tab</span>
        <button class="tab-close" aria-label="Close tab"><i class="fa-solid fa-x"></i></button>
    `;

	const iframe = document.createElement("iframe");
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "none";
	iframe.style.display = "none";
	contentArea.appendChild(iframe);

	const entry = { tab, iframe, frame: null, history: [], historyIndex: -1 };
	const index = tabs.length;
	tabs.push(entry);

	iframe.addEventListener("load", () => {
		try {
			// Keep history/address bar in sync when the page navigates itself
			// (link clicks, redirects, form posts).
			let live = null;
			try {
				live = iframe.contentWindow.location.href;
			} catch (_) {}

			if (live && live.includes(PROXY_MARKER)) {
				const real = $scramjet.unrewriteUrl(live, entry.frame.context);
				const current = entry.history[entry.historyIndex];
				if (!current || normalizeUrl(real) !== normalizeUrl(current)) {
					entry.history = entry.history.slice(0, entry.historyIndex + 1);
					entry.history.push(real);
					entry.historyIndex = entry.history.length - 1;
					if (tabs[activeTabIndex] === entry) {
						addressBar.value = real;
						updateNavButtons();
					}
				}
			}

			const doc = iframe.contentDocument;
			if (!doc) return;
			const title = doc.title || "New Tab";
			const iconEl = doc.querySelector("link[rel~='icon']");
			const favicon = iconEl ? iconEl.href : "/favicon.ico";
			const i = tabs.indexOf(entry);
			if (i >= 0) updateTabTitle(i, title, favicon);
		} catch (_) {
			// not readable; ignore
		}
	});

	tab.querySelector(".tab-close").addEventListener("click", (e) => {
		e.stopPropagation();
		const i = tabs.indexOf(entry);
		if (i >= 0) closeTab(i);
	});

	tab.addEventListener("click", () => {
		const i = tabs.indexOf(entry);
		if (i >= 0) setActiveTab(i);
	});

	tabContainer.insertBefore(tab, document.getElementById("new-tab-btn"));
	setActiveTab(index);

	if (url) {
		navigate(url);
	} else {
		iframe.src = "/index.html";
	}
}

function closeTab(index) {
	if (tabs.length === 1) {
		window.location.href = "/";
		return;
	}

	const { tab, iframe } = tabs[index];
	tab.remove();
	iframe.remove();
	tabs.splice(index, 1);

	// Recalculate active index after splice shifts elements
	activeTabIndex = -1;
	setActiveTab(Math.min(index, tabs.length - 1));
}

async function navigate(input) {
	await navigateTo(search(input, DEFAULT_SEARCH));
}

async function navigateTo(url) {
	if (activeTabIndex < 0) return;
	const entry = tabs[activeTabIndex];

	try {
		const frame = await ensureFrame(entry);

		// Trim forward history when navigating from mid-stack
		entry.history = entry.history.slice(0, entry.historyIndex + 1);
		entry.history.push(url);
		entry.historyIndex = entry.history.length - 1;

		if (tabs[activeTabIndex] === entry) addressBar.value = url;
		frame.go(url);
		updateNavButtons();
	} catch (err) {
		console.error("Navigation failed:", err);
	}
}

async function goBack() {
	if (activeTabIndex < 0) return;

	const current = tabs[activeTabIndex];
	if (current.historyIndex <= 0) return;
	current.historyIndex--;
	const url = current.history[current.historyIndex];
	addressBar.value = url;
	(await ensureFrame(current)).go(url);
	updateNavButtons();
}

async function goForward() {
	if (activeTabIndex < 0) return;

	const current = tabs[activeTabIndex];
	if (current.historyIndex >= current.history.length - 1) return;
	current.historyIndex++;
	const url = current.history[current.historyIndex];
	addressBar.value = url;
	(await ensureFrame(current)).go(url);
	updateNavButtons();
}

async function refresh() {
	if (activeTabIndex < 0) return;

	const current = tabs[activeTabIndex];
	const url = current.history[current.historyIndex];
	if (url) (await ensureFrame(current)).go(url);
}

btnBack.addEventListener("click", goBack);
btnForward.addEventListener("click", goForward);
btnRefresh.addEventListener("click", refresh);
btnBackToMainSite.addEventListener("click", () => (window.location.href = "/"));

addressBar.addEventListener("keydown", (e) => {
	if (e.key === "Enter") navigate(addressBar.value.trim());
});

addressBar.addEventListener("focus", () => addressBar.select());

const newTabBtn = document.createElement("button");
newTabBtn.id = "new-tab-btn";
newTabBtn.setAttribute("aria-label", "New tab");
newTabBtn.textContent = "+";
tabContainer.appendChild(newTabBtn);
newTabBtn.addEventListener("click", () => createTab());

const startUrl = new URLSearchParams(location.search).get("url");
createTab(startUrl || undefined);
