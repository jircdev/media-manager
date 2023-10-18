import type { IWidgetStore } from '@beyond-js/widgets/controller';
import { Uploader } from '@bgroup/media-manager/uploader';
export class StoreManager implements IWidgetStore {
	#uploader: Uploader;
	get uploader() {
		return this.#uploader;
	}
	constructor() {
		this.#uploader = new Uploader({
			name: 'files',
			url: '/api/upload',
			multiple: true,
		});
	}

	create(input: HTMLElement, draggable: HTMLElement) {
		this.#uploader.create(input, draggable);
	}
}
