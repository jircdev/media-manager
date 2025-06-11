/**
 * File: adapters\base.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import { INVALID_CHARS } from '../common/regex';

export interface IFileItem {
	file: File;
	src?: string;
}

interface IFile {}
export class BaseFile extends ReactiveModel<IFile> {
	#loaded: number = 0;

	#specs: any;
	#type: string;
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
	protected _items = new Map<string, IFileItem>();

	get items(): Map<string, IFileItem> {
		return this._items;
	}

	get entries(): IFileItem[] {
		return [...this._items.values()];
	}

	constructor(parent: any, specs: any) {
		super();
		this.#specs = specs;
		this.#type = specs.type ? specs.type : 'any';
	}

	// Registro extensible de tipos de archivo
	protected FILE_TYPE: Record<string, string[]> = {
		document: [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/plain',
			'application/pdf'
		],
		image: ['image/png', 'image/jpeg', 'image/gif'],
		json: ['application/json'],
		zip: ['application/x-zip-compressed'],
		audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/flac', 'audio/x-m4a']
	};

	public registerFileType(category: string, mimes: string[]): void {
		if (!this.FILE_TYPE[category]) this.FILE_TYPE[category] = [];
		this.FILE_TYPE[category].push(...mimes);
	}

	// Métodos onload/onloadend eliminados: la lógica ahora está en #readFile

	#onerror = (event: any) => console.error(4, event);

	validateFile = (file: File) => {
		const isValid = !!this.FILE_TYPE[this.#type]?.find(item => item === file.type);
		if (!isValid) {
			this.#errors.push(file.name.replace(INVALID_CHARS, ''));
		}
		return isValid;
	};

	#readFile = async (file: File): Promise<void> => {
		if (this.#type !== 'any') {
			const isValid = this.validateFile(file);
			if (!isValid) {
				this.triggerEvent('validation:error', { file, reason: 'invalid-type' });
				return;
			}
		}

		const name = file.name.replace(INVALID_CHARS, '');
		// Limpiar src anterior si existe
		const prev = this._items.get(name);
		if (prev && prev.src) URL.revokeObjectURL(prev.src);

		const src = URL.createObjectURL(file);
		this._items.set(name, { file, src });
		this.#loaded++;

		this.triggerEvent('file:loaded', { file, src });
		if (this.#loaded === this._items.size) {
			this.triggerEvent('all:loaded', { files: this.entries });
		}
	};

	#validateLoad = () => {
		if (this.#loaded === this._items.size) {
		}
	};

	clean = () => {
		// Liberar los objectURL creados
		for (const item of this._items.values()) {
			if (item.src) URL.revokeObjectURL(item.src);
		}
		this._items = new Map();
		this.#loaded = 0;
		this.triggerEvent('clean');
	};

	/**
	 *
	 * @param fileList
	 */
	readLocal = async (fileList: File[]) => {
		this.fetching = true;
		const promises: Promise<void>[] = [];
		for (let i = 0; i < fileList.length; ++i) {
			const file = fileList[i];
			promises.push(this.#readFile(file));
		}
		await Promise.all(promises);
		this.fetching = false;
	};
}

/**
 * File: adapters\index.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import { MobileFilesUploader } from './mobile';
import { WebFilesUploader } from './web';

export class FilesUploader extends ReactiveModel<FilesUploader> {
	static #instance;

	static getInstance(parent, specs) {
		if (this.#instance) return this.#instance;
		return new WebFilesUploader(parent, specs);
	}
}

/**
 * File: adapters\mobile.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';

export class MobileFilesUploader extends ReactiveModel<MobileFilesUploader> {
	private _loaded: number = 0;
	private files = new Map();
	private base64?: string;
	private _specs: any;
	private _errors: any[] = [];

	constructor(specs: any) {
		super();
		this._specs = specs;
	}

	clean = () => {
		this.files = new Map();
		this._loaded = 0;
	};

	getFiles = async (data: any) => {
		this.clean();

		this.base64 = data.url;
		this.triggerEvent('loading');

		/**
		 * todo: @julio check
		 */
		const [dir, filename] = data.name.split('com.jidadesarrollos.bovino/cache/');
		this.files.set(filename, data.url);
		this.triggerEvent('loadend');
	};

	get entries() {
		return this.files;
	}

	get total() {
		return this.files.size;
	}
}

/**
 * File: adapters\web.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import { BaseFile } from './base';

export class WebFilesUploader extends BaseFile {}

/**
 * File: common\regex.ts
 */
// Expresiones regulares comunes para el uploader
export const INVALID_CHARS = /[^\w\d.]/g;

/**
 * File: helpers\exif-orientation.ts
 */
/**
 * Extracts the EXIF Orientation value from a JPEG image's binary data.
 *
 * The EXIF Orientation tag (0x0112) indicates the correct orientation of the image
 * (e.g. normal, rotated 90°, 180°, etc.). This is especially important for displaying
 * images taken on mobile devices where the physical rotation of the camera is stored
 * as metadata instead of modifying the pixel data.
 *
 * @param {ArrayBuffer} arrayBuffer - The binary content of a JPEG image.
 * @returns {number} A number from 1 to 8 representing the orientation according to the EXIF standard:
 *  - 1: Normal (no rotation)
 *  - 3: Rotated 180°
 *  - 6: Rotated 90° clockwise
 *  - 8: Rotated 90° counterclockwise
 *  - Other values may exist but are less commonly used.
 *  - Returns 1 if the orientation tag is not present, if the file is not a JPEG,
 *    or if parsing fails.
 *
 * @example
 * const buffer = await file.arrayBuffer();
 * const orientation = getExifOrientation(buffer);
 * if (orientation === 6) {
 *   // Rotate image 90° clockwise
 * }
 */
export function getExifOrientation(arrayBuffer: ArrayBuffer): number {
	const view = new DataView(arrayBuffer);
	if (view.getUint16(0, false) !== 0xffd8) return 1; // Not JPEG
	let offset = 2;
	const length = view.byteLength;

	while (offset < length) {
		if (view.getUint16(offset + 2, false) <= 8) return 1;
		const marker = view.getUint16(offset, false);
		offset += 2;

		if (marker === 0xffe1) {
			if (view.getUint32((offset += 2), false) !== 0x45786966) return 1; // "Exif"
			const little = view.getUint16((offset += 6), false) === 0x4949;
			offset += view.getUint32(offset + 4, little);
			const tags = view.getUint16(offset, little);
			offset += 2;

			for (let i = 0; i < tags; i++) {
				if (view.getUint16(offset + i * 12, little) === 0x0112) {
					return view.getUint16(offset + i * 12 + 8, little);
				}
			}
		} else if ((marker & 0xff00) !== 0xff00) break;
		else offset += view.getUint16(offset, false);
	}

	return 1;
}

/**
 * File: helpers\resize.ts
 */
import { getExifOrientation } from './exif-orientation';

export interface IResizeSpecs {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface IResizedImage {
	src: string;
	width: number;
	height: number;
	orientation: number;
}

/**
 * Resizes and re-encodes an image given its URL.
 *
 * This function downloads an image, detects its EXIF orientation metadata, applies basic rotation,
 * resizes it proportionally to fit within specified maxWidth and maxHeight, and returns a base64-encoded version
 * in the selected format.
 *
 * **Limitations:**
 * - Transparency is lost when using `image/jpeg` (default). Use `image/png` if you need transparency.
 * - Some browsers may not support `image/webp` or `OffscreenCanvas`.
 * - EXIF orientation support is limited to 1 (normal), 3, 6, and 8.
 * - The original format is not preserved unless explicitly set via `outputType`.
 *
 * @param {string} url - The image URL to load.
 * @param {IResizeSpecs} specs - Optional resizing and output settings.
 * @returns {Promise<IResizedImage>} A resized, re-encoded image result.
 */
export async function resizePicture(url: string, specs?: IResizeSpecs): Promise<IResizedImage> {
	specs = specs || {};
	const maxWidth = specs.maxWidth || 800;
	const maxHeight = specs.maxHeight || maxWidth / (4 / 3);
	const quality = specs.quality || 0.8;

	// Default to JPEG if not provided
	const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
	const outputType = supportedTypes.includes(specs.outputType as string) ? specs.outputType! : 'image/jpeg';

	// Download the image as Blob and ArrayBuffer
	const response = await fetch(url);
	const blob = await response.blob();
	const arrayBuffer = await blob.arrayBuffer();

	// Extract EXIF orientation metadata
	const orientation = getExifOrientation(arrayBuffer);

	// Create image source (ImageBitmap or <img> element fallback)
	let imageBitmap: ImageBitmap | HTMLImageElement;
	try {
		if ('createImageBitmap' in window) {
			imageBitmap = await createImageBitmap(blob, {
				imageOrientation: 'none'
			} as any);
		} else {
			throw new Error();
		}
	} catch {
		imageBitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});
	}

	let width = imageBitmap.width;
	let height = imageBitmap.height;

	// Proportional resize based on aspect ratio
	if (width < height && height > maxHeight) {
		width = Math.round((width * maxHeight) / height);
		height = maxHeight;
	} else if (width >= height && width > maxWidth) {
		height = Math.round((height * maxWidth) / width);
		width = maxWidth;
	}

	// Prepare canvas
	const useOffscreen = typeof OffscreenCanvas !== 'undefined';
	let canvas: HTMLCanvasElement | OffscreenCanvas;

	canvas = useOffscreen ? new OffscreenCanvas(width, height) : document.createElement('canvas');

	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	if (!ctx) throw new Error('Unable to get 2D context');

	// Apply basic EXIF rotation
	switch (orientation) {
		case 3:
			ctx.translate(width, height);
			ctx.rotate(Math.PI);
			break;
		case 6:
			[width, height] = [height, width];
			canvas.width = width;
			canvas.height = height;
			ctx.translate(width, 0);
			ctx.rotate(Math.PI / 2);
			break;
		case 8:
			[width, height] = [height, width];
			canvas.width = width;
			canvas.height = height;
			ctx.translate(0, height);
			ctx.rotate(-Math.PI / 2);
			break;
		default:
			if (orientation !== 1) {
				console.warn(`Unsupported EXIF orientation: ${orientation}`);
			}
	}

	ctx.drawImage(imageBitmap, 0, 0, width, height);

	// Export canvas as base64-encoded image
	let src: string;
	if (canvas instanceof OffscreenCanvas) {
		const finalBlob = await canvas.convertToBlob({
			type: outputType,
			quality
		});
		src = await new Promise<string>(resolve => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.readAsDataURL(finalBlob);
		});
	} else {
		src = (canvas as HTMLCanvasElement).toDataURL(outputType, quality);
	}

	return { src, width, height, orientation };
}

/**
 * File: index.ts
 */
import { mediaDevice } from '@aimpact/media-manager/main';
import { ReactiveModel } from '@beyond-js/reactive/model';
import { DraggableUploader } from './draggable';
import { FilesUploader } from './adapters';
import { BaseFile } from './adapters/base';
import { XHRLoader } from './xhr';
import { IUploaderSpecs, IUploaderEvents, UploaderEvents } from './types';

interface IUploader {
	files: BaseFile;
}
export /*bundle*/ class Uploader extends ReactiveModel<IUploader> {
	#files: BaseFile;
	#fileInput = document.createElement('input');
	#draggable;
	#attrs;
	#selector: HTMLElement;
	#specs;
	#errors;
	get files() {
		return this.#files;
	}

	get errors() {
		return this.#errors;
	}

	constructor(specs: IUploaderSpecs = {} as IUploaderSpecs) {
		super();
		if (!specs.input) specs.input = {};
		this.#files = FilesUploader.getInstance(this, specs);
		this.#draggable = new DraggableUploader(this, this.#files);
		// globalThis.up = this; // Eliminado
		this.#files.on(UploaderEvents.Change, this.#listenChanges);
		this.#files.on(UploaderEvents.Error, this.getErrors);
		this.#files.on(UploaderEvents.LoadEnd, this.filesLoaded);
		const params = { ...specs.input };
		params.multiple = specs.multiple ?? false;
		this.#specs = specs;
		this.setAttributes(params);
	}

	#listenChanges = () => {
		this.fetching = this.#files.fetching;
		this.ready = this.#files.ready;
	};
	setAttributes = (specs: Partial<HTMLInputElement> & { multiple?: boolean }) => {
		if (!specs) specs = {};
		let attrs = {
			type: 'file',
			style: 'display:none',
			name: 'input_upload',
			...specs
		};
		this.#fileInput.multiple = specs.multiple ?? false;
		for (let prop in attrs) {
			this.#fileInput.setAttribute(prop, attrs[prop]);
		}
		this.#attrs = attrs;
	};

	// Métodos públicos

	destroy = () => {
		// Limpiar listeners y referencias
		if (this.#selector) {
			this.#selector.removeEventListener('click', this.openDialog);
		}
		this.#fileInput.removeEventListener('change', this.#onChangeInput);
		if (this.#draggable && typeof this.#draggable.remove === 'function') {
			this.#draggable.remove();
		}
		this.#files.off(UploaderEvents.Change, this.#listenChanges);
		this.#files.off(UploaderEvents.Error, this.getErrors);
		this.#files.off(UploaderEvents.LoadEnd, this.filesLoaded);
		this.#selector = undefined;
		this.#draggable = undefined;
		this.#attrs = undefined;
		this.#specs = undefined;
		this.#errors = undefined;
	};

	// Opcional: Exponer métodos para chunked upload y retries en el futuro
	// Ejemplo de firma:
	// async uploadChunked(files: File[], options: { chunkSize: number, retries: number }) {}

	openDialog = () => {
		this.#fileInput.click();
	};
	filesLoaded = () => this.trigger(UploaderEvents.LoadEnd);
	pictureLoaded = () => this.trigger(UploaderEvents.PictureLoaded);
	pictureLoading = () => this.trigger(UploaderEvents.PictureLoading);
	getErrors = () => (this.#errors = this.files.errors);

	clean = async () => {
		await this.#files.clean();
		// await this.#mobileFiles.clean();
	};

	delete = async (fileName: string) => {
		await this.#files.items.delete(fileName);
		this.trigger('change');
	};

	create = (selector: HTMLElement, draggableSelector: HTMLElement | undefined) => {
		if (mediaDevice.type === 'MOBILE') {
			selector.addEventListener('click', mediaDevice.openGallery);
		}
		this.#selector = selector;
		/**
		 * Adds de click and change events into the input file
		 */
		const addListeners = () => {
			if (!selector) return;
			selector.addEventListener('click', this.openDialog);
			this.#fileInput.addEventListener('change', this.#onChangeInput);
		};

		selector.after(this.#fileInput);
		addListeners();
		if (draggableSelector) this.#draggable.add(draggableSelector);
	};
	#onChangeInput = async event => {
		this.clean();

		this.fetching = true;
		this.trigger('change'); // todo: fetching property need to fires this event
		const target = event.currentTarget;
		window.setTimeout(async () => {
			this.#files.total = target.files.length;
			await this.#files.readLocal(target.files);
			this.fetching = false;
			this.trigger('change'); // todo: fetching property need to fires this event
		}, 0);
	};

	publish = async (additionalParams = {}) => {
		const form = this.buildFormData(additionalParams);
		const specs: IUploaderSpecs = this.#specs;
		const xhr = new XHRLoader();
		// Aquí se podría implementar lógica para chunked upload y retries si specs.chunked está activo
		const response = await xhr.upload(form, specs.url);
		return response.json();
	};

	buildFormData = (additionalParams = {}): FormData => {
		const form = new FormData();
		const collection = this.#files;
		const specs: IUploaderSpecs = this.#specs;
		const name = collection.total > 1 ? `${specs.name}` : specs.name;
		// Adjuntar archivos individualmente con su nombre
		collection.entries.forEach(item => form.append(name, item.file, item.file.name));
		// Adjuntar metadatos como JSON
		form.append(
			'metadata',
			JSON.stringify({
				files: collection.entries.map(f => f.file.name),
				...specs.params,
				...additionalParams
			})
		);
		return form;
	};
}

/**
 * File: types.ts
 */
// Tipos y enums para el uploader

export interface IUploaderSpecs {
	url: string;
	name: string;
	input?: Partial<HTMLInputElement>;
	multiple?: boolean;
	params?: Record<string, any>;
	chunked?: boolean; // Soporte de subida fragmentada
	chunkSize?: number; // Tamaño del chunk en bytes
	retries?: number; // Reintentos configurables
}

export interface IUploaderEvents {
	[UploaderEvents.LoadEnd]?: () => void;
	[UploaderEvents.PictureLoaded]?: () => void;
	[UploaderEvents.PictureLoading]?: () => void;
	[UploaderEvents.Error]?: (error: any) => void;
	[UploaderEvents.Change]?: () => void;
}

export enum UploaderEvents {
	LoadEnd = 'loadend',
	PictureLoaded = 'pictureLoaded',
	PictureLoading = 'pictureLoading',
	Error = 'error',
	Change = 'change'
}

/**
 * File: ui\draggable.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import type { Uploader } from '.';
import type { WebFilesUploader } from './adapters/web';

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
 * File: xhr.ts
 */
import { PendingPromise } from '@beyond-js/kernel/core';
import { ReactiveModel } from '@beyond-js/reactive/model';

interface IHeaderSpecs {
	bearer?: string;
	[key: string]: any;
}

/**
 * XHRLoader manages the file upload process via XHR/fetch with support for progress, errors, and authentication.
 */
export /*bundle*/ class XHRLoader extends ReactiveModel<XHRLoader> {
	private promise?: PendingPromise<any>;
	private uploaded = false;
	private progress = 0;
	private error = false;
	#bearer?: string;

	constructor() {
		super();
	}

	/**
	 * Sets the Bearer token for authentication in the headers.
	 * @param bearer Authentication token.
	 * @returns Instance for chaining.
	 */
	bearer(bearer: string | undefined): this {
		if (bearer) this.#bearer = bearer;
		return this;
	}

	/**
	 * Indicates if there is an upload in progress.
	 */
	get uploading(): boolean {
		return !!this.promise;
	}

	/**
	 * Indicates if the upload was completed.
	 */
	get isUploaded(): boolean {
		return this.uploaded;
	}

	/**
	 * Upload progress (0-100).
	 */
	get uploadProgress(): number {
		return this.progress;
	}

	/**
	 * Indicates if an error occurred during upload.
	 */
	get hasError(): boolean {
		return this.error;
	}

	/**
	 * Handles the upload progress event.
	 */
	private onProgress(event: ProgressEvent): void {
		if (event.lengthComputable) {
			const percent = Math.round((event.loaded * 100) / event.total);
			this.progress = percent;
		}
		this.triggerEvent('change');
	}

	/**
	 * Handles the upload completed event.
	 */
	private onCompleted(_event: ProgressEvent): void {
		this.uploaded = true;
		this.promise?.resolve();
		this.triggerEvent('change');
		setTimeout(() => {
			this.promise = undefined;
			this.triggerEvent('change');
		}, 100);
	}

	/**
	 * Handles the upload error event.
	 */
	private onError(event: ProgressEvent): void {
		// Improvement: allow injection of external logger
		if (process.env.NODE_ENV !== 'production') {
			// Only log in development
			// eslint-disable-next-line no-console
			console.error('Error uploading picture', event);
		}
		this.error = true;
		this.promise?.reject();
		this.triggerEvent('change');
	}

	/**
	 * Handles the upload abort event.
	 */
	private onAbort(): void {
		this.promise?.resolve(false);
		this.triggerEvent('change');
	}

	/**
	 * Generates the necessary headers for the request.
	 * @param specs Additional specifications and headers.
	 */
	getHeaders(specs: IHeaderSpecs = {}): Headers {
		const headers = new Headers();
		const bearer = specs.bearer || this.#bearer;
		if (bearer) {
			headers.append('Authorization', `Bearer ${bearer}`);
		}
		if (specs.bearer) delete specs.bearer;

		Object.keys(specs).forEach((key: string): void => {
			if (key === 'bearer') return;
			headers.append(key, specs[key]);
		});
		return headers;
	}

	/**
	 * Uploads a file using fetch and returns the response.
	 * @param data FormData to upload.
	 * @param url Destination URL.
	 * @returns Response from the request.
	 * @throws Error if the upload fails.
	 */
	public async upload(data: FormData, url: string): Promise<Response> {
		try {
			const headers = this.getHeaders();
			const specs: RequestInit = {
				method: 'POST',
				headers,
				body: data
			};
			const response = await fetch(url, specs);
			if (!response.ok) {
				this.error = true;
				throw new Error(`Upload failed with status ${response.status}`);
			}
			return response;
		} catch (e) {
			this.error = true;
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.error('Error in upload:', e);
			}
			throw e;
		}
	}

	/**
	 * Aborts the upload and marks the state as cancelled.
	 */
	public abort(): void {
		if (this.promise) {
			this.promise.reject();
			this.triggerEvent('change');
		}
	}
}
