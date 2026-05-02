/**
 * Web Worker: SHA-256 hash computation.
 *
 * Receives an ArrayBuffer (transferred from main thread), computes SHA-256
 * via the Web Crypto API, and posts back the hex digest string.
 *
 * Moving this off the main thread prevents UI jank on large (up to 20 MB) PDFs.
 */

self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
	const hash = await crypto.subtle.digest("SHA-256", e.data);
	const bytes = new Uint8Array(hash);
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, "0");
	}
	self.postMessage(hex);
};

export {};
