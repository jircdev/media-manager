import {PendingPromise} from '@beyond-js/kernel/core';
import {ReactiveModel} from '@beyond-js/reactive/model';
interface IFile {}
export class BaseFile extends ReactiveModel<IFile> {
	#loaded: number = 0;

	#specs: any;
	#type: string;
	private regExp = /[^\w\d.]/g;
	#errors: any[] = [];
	get errors() {
		return this.#errors;
	}
	protected _total: number = 0;
	get total() {
		return this._total;
	}
	set total(value) {
		if (value === this._total) return;
		this._total = value;
	}
	protected _items = new Map();

	get items() {
		return this._items;
	}

	get entries() {
		return [...this._items.values()];
	}

	constructor(parent: any, specs: any) {
		super();
		this.#specs = specs;
		this.#type = specs.type ? specs.type : 'any';
	}

	// @todo: @jircdev add support for multiple files in extensible way
	protected FILE_TYPE = Object.freeze({
		document: [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/plain',
			'application/pdf',
		],
		image: ['image/png', 'image/jpeg', 'image/gif'],
		json: ['application/json'],
		zip: ['application/x-zip-compressed'],
		audio: [
			'audio/mpeg', // MP3 files
			'audio/ogg', // Ogg Vorbis files
			'audio/wav', // WAV files
			'audio/webm', // WebM audio files
			'audio/aac', // AAC files
			'audio/flac', // FLAC files
			'audio/x-m4a', // mp4 files, older version
		],
	});

	#onload = (event: any) => {
		event.target.removeEventListener('load', this.#onload);
		if (this.#specs.onload && typeof this.#specs.onload === 'function') {
			this.#specs.onload(event);
		}
	};

	#onloadend = (event: any, file: any) => {
		this.#loaded = this.#loaded + 1;

		const name = file.name;
		file = this._items.get(name);

		file.src = event.target.result;

		this._items.set(name, file);

		event.target.removeEventListener('onloadend', this.#onloadend);
		this.triggerEvent('file.loaded');
		if (this.#loaded === this._items.size) this.triggerEvent('loadend');
		if (this.#specs.onloadend && typeof this.#specs.onloadend === 'function') {
			this.#specs.onload(event);
		}
	};

	#onerror = (event: any) => console.error(4, event);

	validate = (file: any) => {
		const isValid = !!this.FILE_TYPE[this.#type].find(item => item === file.type);

		if (!isValid) {
			this.#errors.push(file.name);
		}
		return isValid;
	};

	#readFile = async (file: any) => {
		const promise = new PendingPromise();
		if (this.#type !== 'any') {
			const isValid = await this.validate(file);
			if (!isValid) {
				this.triggerEvent('error');
				return;
			}
		}

		const reader = new FileReader();
		reader.onload = event => this.#onload(event);
		reader.onloadend = event => {
			this.#onloadend(event, file);
			promise.resolve();
		};
		reader.onerror = event => this.#onerror(event);
		reader.readAsDataURL(file);
		return promise;
	};

	#validateLoad = () => {
		if (this.#loaded === this._items.size) {
		}
	};

	validateExtension = (file: any, allowedExtensions: string[]) => {

		const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
		const isValidExtension = allowedExtensions.includes(fileExtension);
		
		if (!isValidExtension) {
			this.#errors.push(file.name);
		}
		
		return isValidExtension;
	};

	clean = () => {
		this._items = new Map();
		this.#loaded = 0;

		this.triggerEvent('items.loaded');
	};

	/**
	 *
	 * @param fileList
	 */
	readLocal = async (fileList: File[]) => {
		this.fetching = true;

		const promises = [];
		for (let i = 0; i < fileList.length; ++i) {
			const file = fileList[i];
			this._items.set(file.name, file);
			promises.push(this.#readFile(file));
		}

		await Promise.all(promises);
		this.fetching = false;
		this.triggerEvent('items.loaded');
		//@todo trigger remove
	};
}
