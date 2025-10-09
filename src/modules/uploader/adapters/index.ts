import { ReactiveModel } from '@beyond-js/reactive/model';
import { WebFilesUploader } from './web';

export class FilesUploader extends ReactiveModel<FilesUploader> {
	static #instance;

	static getInstance(specs = {}) {
		if (this.#instance) return this.#instance;
		return new WebFilesUploader(specs);
	}
}
