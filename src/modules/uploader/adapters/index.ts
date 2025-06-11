import { ReactiveModel } from "@beyond-js/reactive/model";
import { MobileFilesUploader } from "./mobile";
import { WebFilesUploader } from "./web";

export class FilesUploader extends ReactiveModel<FilesUploader> {
  static #instance;

  static getInstance(parent, specs) {
    if (this.#instance) return this.#instance;
    return new WebFilesUploader(parent, specs);
  }
}
