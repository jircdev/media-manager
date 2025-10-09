// validators/image.ts
import { IBaseFile } from '../core/types';
import { IFileValidator } from '../core/types';

export interface IImageValidatorOptions {
	maxSize?: number; // in MB
	allowedTypes?: string[];
}

export class ImageValidator implements IFileValidator {
	#options: IImageValidatorOptions;

	constructor(options: IImageValidatorOptions = {}) {
		this.#options = options;
	}

	async validate(file: IBaseFile): Promise<void> {
		if (!file.type.startsWith('image/')) {
			throw new Error(`File "${file.name}" is not a valid image`);
		}

		if (this.#options.allowedTypes && !this.#options.allowedTypes.includes(file.type)) {
			throw new Error(`File type "${file.type}" not allowed`);
		}

		if (this.#options.maxSize && file.size > this.#options.maxSize * 1024 * 1024) {
			throw new Error(`File "${file.name}" exceeds max size of ${this.#options.maxSize} MB`);
		}
	}
}
