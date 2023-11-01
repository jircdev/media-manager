import type { IWidgetStore } from '@beyond-js/widgets/controller';
import { Uploader } from '@bgroup/media-manager/uploader';
export class StoreManager implements IWidgetStore {
	#uploader: Uploader;
	get uploader() {
		return this.#uploader;
	}
	constructor() {
		this.#uploader = new Uploader({
			name: 'images',
			url: 'http://localhost:5000/upload',
			multiple: true,
		});
	}

	create(input: HTMLElement, draggable: HTMLElement) {
		this.#uploader.create(input, draggable);
	}
}
