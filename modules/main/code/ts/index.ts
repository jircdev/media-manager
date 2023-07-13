import { DesktopMediaDevice } from "./desktop";
import { MobileMediaDevice } from "./mobile";

let media;

function getMedia(clean = false) {
	if (clean) media = undefined;
	if (media) return media;
	const types = Object.freeze({
		MOBILE: 0,
		DESKTOP: 1,
	});

	const deviceType = globalThis.cordova ? types.MOBILE : types.DESKTOP;

	const models = Object.freeze({
		1: DesktopMediaDevice,
		0: MobileMediaDevice,
	});

	media = models[deviceType];
	return media;
}

export const /*bundle*/ mediaDevice = getMedia();
