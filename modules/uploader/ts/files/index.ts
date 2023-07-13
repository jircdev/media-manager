import { ReactiveModel } from '@beyond-js/reactive/model';
import { MobileFilesUploader } from './mobile';
import { WebFilesUploader } from './web';

export class FilesUploader extends ReactiveModel {
    static #instance;

    static getInstance(parent, specs) {
        if (this.#instance) return this.#instance;
        if (globalThis.phonegap) return new MobileFilesUploader(parent);
        return new WebFilesUploader(parent, specs);
    }
}
