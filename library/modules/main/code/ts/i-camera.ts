export interface ICamera {
	isReady: boolean;
	readonly PLATFORM: string;

	getPicture: Function;
	openGallery: Function;
}
