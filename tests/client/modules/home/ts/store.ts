import type { IWidgetStore } from '@beyond-js/widgets/controller';
import { Uploader } from '@bgroup/media-manager/uploader';
import { ReactiveModel } from '@beyond-js/reactive/model';

export class StoreManager extends ReactiveModel implements IWidgetStore {
	#uploader: Uploader;
	declare fetching;
	get uploader() {
		return this.#uploader;
	}
	constructor() {
		super();
		this.#uploader = new Uploader({
			name: 'images',
			url: 'http://localhost:5000/images/upload',
			multiple: true,
		});
	}

	create(input: HTMLElement, draggable: HTMLElement) {
		this.#uploader.create(input, draggable);
	}

	async upload() {
		try {
			this.fetching = true;
			this.#uploader.publish({
				folder: 'beyondjs',
			});
		} catch (e) {
			console.error(e);
		} finally {
			this.fetching = true;
		}
	}
}
