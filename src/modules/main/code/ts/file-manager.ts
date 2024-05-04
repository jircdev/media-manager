import { PendingPromise } from "@beyond-js/kernel/core";
let promise;

/**
 * REturns a valid url of the image loaded
 *
 * @platform mobile
 * @param data
 * @returns
 */
export function getUrl(data) {
	if (promise) return promise;
	promise = new PendingPromise();
	const process = function processFile(entry) {
		entry.file(file => {
			const reader = new FileReader();
			reader.onloadend = a => {
				promise.resolve(reader.result);
				promise = undefined;
			};
			reader.readAsDataURL(file);
		});
	};
	globalThis.resolveLocalFileSystemURL(data, process);
	return promise;
}
