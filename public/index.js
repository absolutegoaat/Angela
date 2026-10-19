"use strict";

const form = document.getElementById("an-form");
const address = document.getElementById("an-address");
const searchEngine = document.getElementById("an-search-engine");
const error = document.getElementById("an-error");
const errorCode = document.getElementById("an-error-code");

form.addEventListener("submit", async (event) => {
	event.preventDefault();

	try {
		await registerSW();
	} catch (err) {
		error.textContent = "Failed to register service worker.";
		errorCode.textContent = err.toString();
		throw err;
	}

	const url = search(address.value, searchEngine.value);
	window.location.href = "/browser.html?url=" + encodeURIComponent(url);
});
