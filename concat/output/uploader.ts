/**
 * File: adapters\base.ts
 */
/**
 * File: adapters/base-files-list.ts
 * Universal file list manager (agnostic to file type).
 */

import { ReactiveModel } from '@beyond-js/reactive/model';
import { FileStatus, IBaseFile } from '../core/types';

export class BaseFilesList extends ReactiveModel<{}> {
	#map = new Map<string, IBaseFile>();
	#total: number = 0;

	get total(): number {
		return this.#total;
	}

	get items(): IBaseFile[] {
		return [...this.#map.values()];
	}

	get map(): Map<string, IBaseFile> {
		return this.#map;
	}

	/**
	 * Add new files to the list. Files are created with "pending" status.
	 */
	addFiles(files: File[]): IBaseFile[] {
		const added: IBaseFile[] = [];

		for (const file of files) {
			const id = crypto.randomUUID();
			const item: IBaseFile = {
				id,
				name: file.name,
				size: file.size,
				type: file.type,
				file,
				status: 'pending'
			};
			this.#map.set(id, item);
			added.push(item);
		}

		this.#total = this.#map.size;
		this.trigger('add', added);
		this.trigger('change', this.items);

		return added;
	}

	/**
	 * Remove a file by ID.
	 */
	remove(id: string): boolean {
		const removed = this.#map.delete(id);
		if (removed) {
			this.#total = this.#map.size;
			this.trigger('remove', id);
			this.trigger('change', this.items);
		}
		return removed;
	}

	/**
	 * Clean all files.
	 */
	async clean(): Promise<void> {
		this.#map.clear();
		this.#total = 0;
		this.trigger('clean');
		this.trigger('change', []);
	}

	/**
	 * Update the status of a file.
	 */
	updateStatus(id: string, status: FileStatus, error?: string): void {
		const item = this.#map.get(id);
		if (!item) return;

		item.status = status;
		if (error) item.error = error;

		this.trigger('update', item);
		this.trigger('change', this.items);
	}
}

/**
 * File: adapters\index.ts
 */
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

/**
 * File: adapters\web.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import { BaseFilesList } from './base';

export class WebFilesUploader extends BaseFilesList {}

/**
 * File: core\registry.ts
 */
// core/registry.ts
import { IFileValidator, IFileProcessor } from './types';
// registry.ts (already exists, unchanged except clarifying return types)
export class Registry {
	static validators: Record<string, new (options?: any) => IFileValidator> = {};
	static processors: Record<string, new (options?: any) => IFileProcessor> = {};

	static registerValidator(name: string, validator: new (options?: any) => IFileValidator) {
		this.validators[name] = validator;
	}

	static registerProcessor(name: string, processor: new (options?: any) => IFileProcessor) {
		this.processors[name] = processor;
	}

	static getValidator(name: string, options?: any): IFileValidator | undefined {
		const V = this.validators[name];
		return V ? new V(options) : undefined;
	}

	static getProcessor(name: string, options?: any): IFileProcessor | undefined {
		const P = this.processors[name];
		return P ? new P(options) : undefined;
	}
}

/**
 * File: core\types.ts
 */
// Tipos y eventos expuestos por el uploader (sin lógica de red)
export type FileStatus = 'pending' | 'validating' | 'ready' | 'uploading' | 'done' | 'error';

export interface IBaseFile {
	id: string;
	name: string;
	size: number;
	type: string;
	file: File;
	previewUrl?: string;
	status: FileStatus;
	error?: string;
	meta?: Record<string, any>;
}
export type ValidatorSpec = IFileValidator | string | { name: string; options?: Record<string, any> };

export type ProcessorSpec = IFileProcessor | string | { name: string; options?: Record<string, any> };

export /*bundle*/ interface IUploaderSpecs {
	multiple?: boolean;
	accept?: string | string[];
	validators?: ValidatorSpec[]; // now supports many
	processors?: ProcessorSpec[]; // now supports many
}

export /*bundle*/ interface IUploaderEvents {
	[UploaderEvents.LoadEnd]?: () => void;
	[UploaderEvents.PictureLoaded]?: () => void;
	[UploaderEvents.PictureLoading]?: () => void;
	[UploaderEvents.Error]?: (error: any) => void;
	[UploaderEvents.Change]?: () => void;
	[UploaderEvents.Clean]?: () => void;
	[UploaderEvents.Delete]?: () => void;
}

export enum UploaderEvents {
	LoadEnd = 'loadend',
	PictureLoaded = 'pictureLoaded',
	PictureLoading = 'pictureLoading',
	Error = 'error',
	Change = 'change',
	Clean = 'clean',
	Delete = 'delete'
}

// core/types.ts

export /*bundle*/ interface IFileValidator {
	validate(file: IBaseFile): Promise<void>;
}

export /*bundle*/ interface IFileProcessor {
	process(file: IBaseFile): Promise<void>;
}
export /*bundle*/ interface IImageFile extends IBaseFile {
	meta: {
		preview: { width: number; height: number };
	};
	toBase64: () => Promise<string>;
}

/**
 * File: index.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import { FilesUploader } from './adapters';
import { BaseFilesList } from './adapters/base';
import {
	IBaseFile,
	IFileProcessor,
	IFileValidator,
	IUploaderSpecs,
	ProcessorSpec,
	UploaderEvents,
	ValidatorSpec
} from './core/types';
import { DraggableUploader } from './inputs/draggable';
import { InputHandler } from './inputs/input';
import { Registry } from './core/registry';
import { ImageValidator } from './validators/image';
import { ImageProcessor } from './processors/image';

interface IUploader {
	files: BaseFilesList;
}
// Register built-in validator/processor once
Registry.registerValidator('image', ImageValidator);
Registry.registerProcessor('image', ImageProcessor);

/**
 * Orchestrator class for file management.
 * Delegates file selection to InputHandler/DraggableUploader,
 * validation/processing to external strategies,
 * and state storage to BaseFilesList.
 */ export /*bundle*/ class Uploader extends ReactiveModel<IUploader> {
	#files: BaseFilesList;
	#draggable?: DraggableUploader;
	#inputHandler?: InputHandler;
	#specs: IUploaderSpecs;
	#validators: IFileValidator[] = [];
	#processors: IFileProcessor[] = [];
	#errors: any;

	get files() {
		return this.#files;
	}
	get errors() {
		return this.#errors;
	}

	constructor(specs: IUploaderSpecs = {} as IUploaderSpecs) {
		super();
		this.#specs = specs;

		this.#validators = this.#resolveValidators(specs.validators);
		this.#processors = this.#resolveProcessors(specs.processors);

		this.#files = FilesUploader.getInstance(this, specs);
		this.#files.on(UploaderEvents.Change, this.#listenChanges);
		this.#files.on(UploaderEvents.LoadEnd, this.#filesLoaded);
	}

	#resolveValidators(validators?: ValidatorSpec[]): IFileValidator[] {
		if (!Array.isArray(validators) || validators.length === 0) return [];

		return validators
			.map(v => {
				if (typeof v === 'string') return Registry.getValidator(v);
				if (typeof v === 'object' && 'name' in v) return Registry.getValidator(v.name, v.options);
				return v as IFileValidator;
			})
			.filter(Boolean) as IFileValidator[];
	}

	#resolveProcessors(processors?: ProcessorSpec[]): IFileProcessor[] {
		if (!Array.isArray(processors) || processors.length === 0) return [];

		return processors
			.map(p => {
				if (typeof p === 'string') return Registry.getProcessor(p);
				if (typeof p === 'object' && 'name' in p) return Registry.getProcessor(p.name, p.options);
				return p as IFileProcessor;
			})
			.filter(Boolean) as IFileProcessor[];
	}

	#listenChanges = () => {
		this.fetching = this.#files.fetching;
		this.ready = this.#files.ready;
	};

	#filesLoaded = () => this.trigger(UploaderEvents.LoadEnd);

	/**
	 * Initialize input and/or draggable handlers.
	 */
	create = (trigger?: HTMLElement, draggableSelector?: HTMLElement) => {
		if (trigger) this.#setupInputHandler(trigger);
		if (draggableSelector) this.#setupDraggable(draggableSelector);
	};

	#setupInputHandler(trigger: HTMLElement) {
		this.#inputHandler = new InputHandler({
			trigger,
			multiple: this.#specs.multiple ?? false,
			accept: this.#specs.accept
		});

		this.#inputHandler.on('onFiles', async files => {
			await this.clean();
			this.fetching = true;
			this.trigger(UploaderEvents.Change);

			const added = this.#files.addFiles(files);
			await this.#processFiles(added);

			this.fetching = false;
			this.trigger(UploaderEvents.Change);
		});

		this.#inputHandler.on('onError', error => {
			this.trigger(UploaderEvents.Error, error);
		});
	}

	#setupDraggable(draggableSelector: HTMLElement) {
		this.#draggable = new DraggableUploader(this, this.#files);
		this.#draggable.add(draggableSelector);
	}

	async #processFiles(files: IBaseFile[]) {
		for (const file of files) {
			try {
				console.log(0.3, this.#validators, this.#processors, file);
				for (const validator of this.#validators) await validator.validate(file);
				for (const processor of this.#processors) await processor.process(file);
				this.#files.updateStatus(file.id, 'ready');
			} catch (err) {
				this.#files.updateStatus(file.id, 'error', (err as Error).message);
			}
		}
	}

	clean = async () => {
		await this.#files.clean();
		this.trigger(UploaderEvents.Clean);
		this.trigger('change');
	};

	delete = async (fileName: string) => {
		await this.#files.map.delete(fileName);
		this.trigger(UploaderEvents.Delete);
	};

	destroy = () => {
		this.#inputHandler?.destroy();
		this.#draggable?.remove();

		this.#files.off(UploaderEvents.Change, this.#listenChanges);
		this.#files.off(UploaderEvents.LoadEnd, this.#filesLoaded);
	};
}

/**
 * File: inputs\draggable.ts
 */
import type { Uploader } from '../';
import type { WebFilesUploader } from '../adapters/web';

export class DraggableUploader {
	#parent: Uploader;
	#files: WebFilesUploader;
	#currentElement?: HTMLElement;
	#boundDrop: (event: DragEvent) => void;
	#boundDragOver: (event: DragEvent) => void;

	constructor(parent: Uploader, files: WebFilesUploader) {
		this.#parent = parent;
		this.#files = files;
		this.#boundDrop = this.onDrop.bind(this);
		this.#boundDragOver = this.onDragOver.bind(this);
	}

	onDrop = (event: DragEvent) => {
		event.preventDefault();
		const { dataTransfer } = event;

		if (!dataTransfer.items.length) {
			return;
		}
		const files: File[] = [];
		for (let i = 0; i < dataTransfer.items.length; ++i) {
			const file = dataTransfer.items[i].getAsFile();
			if (file) {
				files.push(file);
			}
		}

		this.#files.readLocal(files);
	};

	/**
	 * This event runs only when are files on the draggable area.
	 * @param event
	 */
	onDragOver = (event: DragEvent) => {
		event.preventDefault();
	};

	/**
	 * Add the drag & drop events to the control
	 * @param {HTMLElement} el - The element to make draggable (input, div, etc)
	 */
	add(el: HTMLElement) {
		if (this.#currentElement) this.remove();
		this.#currentElement = el;
		el.addEventListener('drop', this.#boundDrop);
		el.addEventListener('dragover', this.#boundDragOver);
	}

	/**
	 * Remove the drag & drop events from the current element, if any
	 */
	remove() {
		if (!this.#currentElement) return;
		this.#currentElement.removeEventListener('drop', this.#boundDrop);
		this.#currentElement.removeEventListener('dragover', this.#boundDragOver);
		this.#currentElement = undefined;
	}
}

/**
 * File: inputs\input.ts
 */
/**
 * File: inputs/input-handler.ts
 * Encapsula el <input type="file"> y expone eventos normalizados
 */

import { ReactiveModel } from '@beyond-js/reactive/model';

export interface IInputHandlerSpecs {
	multiple?: boolean;
	accept?: string | string[];
	capture?: boolean | string;
	trigger: string | HTMLElement; // selector o elemento que dispara el diálogo
}

export interface IInputHandlerEvents {
	onFiles?: (files: File[]) => void;
	onError?: (error: Error) => void;
}

export class InputHandler extends ReactiveModel<IInputHandlerEvents> {
	#input: HTMLInputElement;
	#trigger: HTMLElement;
	#specs: IInputHandlerSpecs;

	constructor(specs: IInputHandlerSpecs) {
		super();
		this.#specs = specs;

		// Guard clauses
		if (!specs.trigger) {
			throw new Error('InputHandler requires a trigger element or selector.');
		}

		this.#trigger = typeof specs.trigger === 'string' ? document.querySelector(specs.trigger) : specs.trigger;

		if (!this.#trigger) {
			throw new Error('Trigger element not found.');
		}

		// Crear input oculto
		this.#input = document.createElement('input');
		this.#input.type = 'file';
		this.#input.style.display = 'none';

		if (specs.multiple) this.#input.multiple = true;
		if (specs.accept) {
			this.#input.accept = Array.isArray(specs.accept) ? specs.accept.join(',') : specs.accept;
		}
		if (specs.capture) {
			(this.#input as any).capture = specs.capture;
		}

		this.#input.addEventListener('change', this.#onChange);
		this.#trigger.addEventListener('click', this.open);

		//insert after the trigger
		this.#trigger.after(this.#input);
	}

	#onChange = () => {
		const files = this.#input.files ? Array.from(this.#input.files) : [];
		if (!files.length) return;

		try {
			this.trigger('onFiles', files);
		} catch (error) {
			this.trigger('onError', error as Error);
		} finally {
			this.#input.value = ''; // reset
		}
	};

	open = (): void => {
		this.#input.click();
	};

	destroy(): void {
		this.#input.removeEventListener('change', this.#onChange);
		this.#trigger.removeEventListener('click', this.open);
		if (this.#input.parentNode) {
			this.#input.parentNode.removeChild(this.#input);
		}
	}
}

/**
 * File: loader\xhr.ts
 */
import { PendingPromise } from '@beyond-js/kernel/core';
import { ReactiveModel } from '@beyond-js/reactive/model';

export /*bundle */ class XHRLoader extends ReactiveModel<XHRLoader> {
	private promise: PendingPromise<any>;
	private uploaded: boolean;
	private progress: number;
	private error: boolean;

	constructor() {
		super();
		this.promise = undefined;
		this.uploaded = false;
		this.progress = 0;
		this.error = false;
	}

	#bearer;
	bearer(bearer: string | undefined) {
		if (bearer) this.#bearer = bearer;
		return this;
	}

	get uploading(): boolean {
		return !!this.promise;
	}

	get isUploaded(): boolean {
		return this.uploaded;
	}

	get uploadProgress(): number {
		return this.progress;
	}

	get hasError(): boolean {
		return this.error;
	}

	private onProgress(event: ProgressEvent): void {
		if (event.lengthComputable) {
			const percent = Math.round((event.loaded * 100) / event.total);
			this.progress = parseInt(percent.toString());
		}

		this.trigger('change');
	}

	private onCompleted(event: ProgressEvent): void {
		this.uploaded = true;
		this.promise.resolve();
		this.trigger('change');

		setTimeout(() => {
			this.promise = undefined;
			this.trigger('change');
		}, 100);
	}

	private onError(event: ProgressEvent): void {
		console.error('Error uploading picture', event);
		this.error = true;
		this.promise.reject();
		this.trigger('change');
	}

	private onAbort(): void {
		this.promise.resolve(false);
		this.trigger('change');
	}

	getHeaders = (specs: any): Headers => {
		let headers: Headers = new Headers();

		const bearer = specs.bearer || this.#bearer;

		if (bearer) {
			headers.append('Authorization', `Bearer ${bearer}`);
		}
		if (specs.bearer) delete specs.bearer;

		const keys: string[] = Object.keys(specs);
		keys.forEach((key: string): void => {
			if (key === 'bearer') return;
			headers.append(key, specs[key]);
		});
		return headers;
	};

	public async upload(data: FormData, url: string): Promise<Response> {
		try {
			let headers = this.getHeaders({});
			const specs = {
				method: 'post',
				headers,
				body: data
			};
			return fetch(url, specs);
		} catch (e) {
			console.error('error', e);
		}
	}

	public abort(): void {
		if (this.promise) {
			this.promise.reject();
			this.trigger('change');
		}
	}
}

/**
 * File: processors\image.ts
 */
// processors/image.ts
import { IImageFile, IBaseFile, IFileProcessor } from '../core/types';

export /*bundle*/ class ImageProcessor implements IFileProcessor {
	async process(file: IBaseFile): Promise<void> {
		const previewUrl = URL.createObjectURL(file.file);
		file.previewUrl = previewUrl;
		console.log(0.2, file.previewUrl);
		const dimensions = await this.getDimensions(previewUrl);

		const imageFile = file as IImageFile;
		imageFile.meta = { preview: { width: dimensions.width, height: dimensions.height } };
		imageFile.toBase64 = () => this.toBase64(file.file);
	}

	private getDimensions(src: string): Promise<{ width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve({ width: img.width, height: img.height });
			img.onerror = () => reject(new Error('Could not load image dimensions'));
			img.src = src;
		});
	}

	private toBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = err => reject(err);
			reader.readAsDataURL(file);
		});
	}
}

/**
 * File: validators\image.ts
 */
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

