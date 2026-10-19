"use strict";

const form = document.getElementById("an-form");
const address = document.getElementById("an-address");
const searchEngine = document.getElementById("an-search-engine");
const error = document.getElementById("an-error");
const errorCode = document.getElementById("an-error-code");

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	const tab = window.open("about:blank", "_blank");
	if (!tab) {
		error.textContent = "The browser blocked the new tab. Allow pop-ups and try again.";
		return;
	}

	const url = search(address.value, searchEngine.value);

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		tab.close();
		throw err;
	}

	try {
		// The app needs a normal same-origin navigation for service-worker control.
		const browserUrl = new URL("/browser.html", location.origin);
		browserUrl.searchParams.set("url", url);
		tab.document.open();
		tab.document.write(
			"<!doctype html><html><head><meta charset=\"utf-8\">" +
				"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
				"<title>Angela</title><style>" +
				"html,body{width:100%;height:100%;margin:0;overflow:hidden}" +
				"iframe{display:block;width:100%;height:100%;border:0}" +
				"</style></head><body></body></html>"
		);
		tab.document.close();

		const browserFrame = tab.document.createElement("iframe");
		browserFrame.title = "Angela";
		browserFrame.src = browserUrl.href;
		tab.document.body.append(browserFrame);
	} catch (err) {
		error.textContent = "Failed to load browser app.";
		errorCode.textContent = err.toString();
		tab.close();
		throw err;
	}
});