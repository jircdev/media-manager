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
export class BaseFilesList extends ReactiveModel<IFile> {
	#loaded: number = 0;

	#specs: any;
	#type: string;
	#accept: string | string[] | null = null;
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
	#map = new Map<string, IFileItem>();
	get map() {
		return this.#map;
	}
	get items(): IFileItem[] {
		return [...this.#map.values()];
	}

	get entries(): IFileItem[] {
		return [...this.#map.values()];
	}

	constructor(parent: any, specs: any) {
		super();
		this.#specs = specs;
		this.#type = specs.type ? specs.type : 'any';
		// Permitir accept como string o string[]
		this.#accept = specs.accept || null;
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

	validateFile = (file: File): boolean => {
		const fileName = file.name.replace(INVALID_CHARS, '');

		// Validación por "accept"
		if (this.#accept) {
			const acceptList = Array.isArray(this.#accept) ? this.#accept : [this.#accept];
			const matchesAccept = acceptList.some(accept => {
				return accept.startsWith('.') ? file.name.endsWith(accept) : file.type === accept;
			});
			if (!matchesAccept) {
				this.#errors.push(`${fileName} (not allowed by accept rule)`);
				this.trigger('validation:error', { file, reason: 'invalid-accept' });
				return false;
			}
		}

		// Validación por "type" predefinido si existe
		if (this.#type !== 'any' && this.FILE_TYPE[this.#type]) {
			const isValidType = this.FILE_TYPE[this.#type].includes(file.type);
			if (!isValidType) {
				this.#errors.push(`${fileName} (invalid MIME type)`);
				this.trigger('validation:error', { file, reason: 'invalid-type' });
				return false;
			}
		}

		// Validación por tamaño máximo
		if (this.#specs?.maxSize && file.size > this.#specs.maxSize) {
			const maxMb = (this.#specs.maxSize / (1024 * 1024)).toFixed(2);
			this.#errors.push(`${fileName} (exceeds max size of ${maxMb} MB)`);
			this.trigger('validation:error', { file, reason: 'max-size-exceeded' });
			return false;
		}

		return true;
	};

	#readFile = async (file: File): Promise<void> => {
		if (this.#type !== 'any') {
			const isValid = this.validateFile(file);
			if (!isValid) {
				this.trigger('validation:error', { file, reason: 'invalid-type' });
				return;
			}
		}

		const name = file.name.replace(INVALID_CHARS, '');
		// Limpiar src anterior si existe
		const prev = this.#map.get(name);
		if (prev && prev.src) URL.revokeObjectURL(prev.src);

		const src = URL.createObjectURL(file);
		this.#map.set(name, { file, src });
		this.#loaded++;

		this.trigger('file:loaded', { file, src });
		// Revocar el objectURL tras emitir file:loaded si no se necesita la vista previa
		URL.revokeObjectURL(src);
		if (this.#loaded === this.#map.size) {
			this.trigger('all:loaded', { files: this.entries });
		}
	};

	#validateLoad = () => {
		if (this.#loaded === this.#map.size) {
		}
	};

	clean = () => {
		// Liberar los objectURL creados
		for (const item of this.#map.values()) {
			if (item.src) URL.revokeObjectURL(item.src);
		}
		this.#map = new Map();
		this.#loaded = 0;
		this.trigger('clean');
	};

	/**
	 *
	 * @param fileList
	 */
	readLocal = async (fileList: File[]) => {
		this.fetching = true;
		await Promise.all(Array.from(fileList).map(file => this.#readFile(file)));
		this.fetching = false;
	};
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
		// Liberar los objectURL creados
		for (const value of this.files.values()) {
			if (value && typeof value === 'object' && value.objectUrl) {
				URL.revokeObjectURL(value.objectUrl);
			}
		}
		this.files = new Map();
		this._loaded = 0;
	};

	/**
	 * Valida el archivo usando la lógica de BaseFile (MIME y extensión)
	 */
	validateFile = (file: { name: string; type?: string }) => {
		const accept = this._specs?.accept || null;
		const type = this._specs?.type || 'any';
		const FILE_TYPE: Record<string, string[]> = {
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
		if (accept) {
			let acceptList: string[] = [];
			if (typeof accept === 'string') {
				acceptList = [accept];
			} else if (Array.isArray(accept)) {
				acceptList = accept;
			}
			const isValid = acceptList.some(a => {
				if (a.startsWith('.')) return file.name.endsWith(a);
				else return file.type === a;
			});
			if (!isValid) this._errors.push(`${file.name} (no permitido por accept)`);
			return isValid;
		}
		if (!FILE_TYPE[type]) return true;
		const isValid = !!FILE_TYPE[type]?.find(item => item === file.type);
		if (!isValid) this._errors.push(`${file.name} (tipo no permitido)`);
		return isValid;
	};

	/**
	 * data: { url: string (base64 o file url), name: string, type?: string }
	 */
	getFiles = async (data: any) => {
		this.clean();
		this.base64 = data.url;
		this.trigger('loading');

		const [dir, filename] = data.name.split('com.jidadesarrollos.bovino/cache/');
		const fileType = data.type || '';
		const fileName = filename || data.name;

		// Validación de tipo MIME/extensión
		if (!this.validateFile({ name: fileName, type: fileType })) {
			this._errors.push('Archivo no válido por tipo/aceptación');
			this.trigger('validation:error', { file: { name: fileName, type: fileType }, reason: 'invalid-type' });
			return;
		}

		let fileEntry: any = { name: fileName, type: fileType };
		// Si es base64, convertir a Blob y luego a objectURL
		if (typeof data.url === 'string' && data.url.startsWith('data:')) {
			try {
				const arr = data.url.split(',');
				const mime = arr[0].match(/:(.*?);/)[1];
				const bstr = atob(arr[1]);
				let n = bstr.length;
				const u8arr = new Uint8Array(n);
				while (n--) u8arr[n] = bstr.charCodeAt(n);
				const blob = new Blob([u8arr], { type: mime });
				const objectUrl = URL.createObjectURL(blob);
				fileEntry = { ...fileEntry, blob, objectUrl };
			} catch (e) {
				this._errors.push('Error convirtiendo base64 a Blob');
				fileEntry = { ...fileEntry, src: data.url };
			}
		} else {
			// Si ya viene como file url, dejarlo igual
			fileEntry = { ...fileEntry, src: data.url };
		}
		this.files.set(fileName, fileEntry);
		this.trigger('loadend');
	};

	get entries() {
		return this.files;
	}

	get total() {
		return this.files.size;
	}

	get errors() {
		return this._errors;
	}
}

/**
 * File: adapters\web.ts
 */
import { ReactiveModel } from '@beyond-js/reactive/model';
import { BaseFilesList } from './base';

export class WebFilesUploader extends BaseFilesList {}

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
import { DraggableUploader } from './ui/draggable';
import { ReactiveModel } from '@beyond-js/reactive/model';
import { FilesUploader } from './adapters';
import { BaseFilesList } from './adapters/base';
import { IUploaderSpecs, UploaderEvents } from './types';

interface IUploader {
	files: BaseFilesList;
}

/**
 * Clase central que permite gestionar archivos locales.
 * No realiza subidas, solo gestiona selección, validación y vistas previas.
 */
export /*bundle*/ class Uploader extends ReactiveModel<IUploader> {
	#files: BaseFilesList;
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
		this.#specs = specs;
		this.#files = FilesUploader.getInstance(this, specs);
		this.#draggable = new DraggableUploader(this, this.#files);

		this.#files.on(UploaderEvents.Change, this.#listenChanges);
		this.#files.on(UploaderEvents.Error, this.getErrors);
		this.#files.on(UploaderEvents.LoadEnd, this.filesLoaded);

		const params = { ...specs.input, multiple: specs.multiple ?? false };
		this.setAttributes(params);
	}

	#listenChanges = () => {
		this.fetching = this.#files.fetching;
		this.ready = this.#files.ready;
	};

	setAttributes = (specs: Partial<HTMLInputElement> & { multiple?: boolean }) => {
		const attrs = {
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

	openDialog = () => this.#fileInput.click();
	filesLoaded = () => this.trigger(UploaderEvents.LoadEnd);
	pictureLoaded = () => this.trigger(UploaderEvents.PictureLoaded);
	pictureLoading = () => this.trigger(UploaderEvents.PictureLoading);
	getErrors = () => (this.#errors = this.files.errors);

	clean = async () => {
		await this.#files.clean();
		this.trigger(UploaderEvents.Clean);
	};

	delete = async (fileName: string) => {
		await this.#files.map.delete(fileName);
		this.trigger(UploaderEvents.Delete);
	};

	destroy = () => {
		if (this.#selector) this.#selector.removeEventListener('click', this.openDialog);
		this.#fileInput.removeEventListener('change', this.#onChangeInput);
		this.#draggable?.remove();
		this.#files.off(UploaderEvents.Change, this.#listenChanges);
		this.#files.off(UploaderEvents.Error, this.getErrors);
		this.#files.off(UploaderEvents.LoadEnd, this.filesLoaded);
	};

	create = (selector: HTMLElement, draggableSelector?: HTMLElement) => {
		this.#selector = selector;

		const addListeners = () => {
			if (!selector) return;
			selector.addEventListener('click', this.openDialog);
			this.#fileInput.addEventListener('change', this.#onChangeInput);
		};

		selector.after(this.#fileInput);
		addListeners();
		if (draggableSelector) this.#draggable.add(draggableSelector);
	};

	#onChangeInput = async (event: Event) => {
		this.clean();
		this.fetching = true;
		this.trigger(UploaderEvents.Change);

		const target = event.currentTarget as HTMLInputElement;
		window.setTimeout(async () => {
			this.#files.total = target.files?.length || 0;
			await this.#files.readLocal(Array.from(target.files ?? []));
			this.fetching = false;
			this.trigger(UploaderEvents.Change);
		}, 0);
	};
}

/**
 * File: types.ts
 */
// Tipos y eventos expuestos por el uploader (sin lógica de red)

export interface IUploaderSpecs {
	name: string;
	input?: Partial<HTMLInputElement>;
	multiple?: boolean;
	base64?: boolean; // defines if the File object will generate a base64 string
	params?: Record<string, any>;
	accept?: string | string[]; // filtros opcionales por tipo
	type?: string; // categoría predefinida: 'image', 'audio', etc.
	maxSize?: number; // nuevo: en bytes (ej: 5 MB = 5 * 1024 * 1024)
}

export interface IUploaderEvents {
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

/**
 * File: ui\draggable.ts
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
 * File: ui\use-uploader.ts
 */
import * as React from 'react';
import { UploaderEvents, IUploaderSpecs } from '../types';
import { Uploader } from '../index';
import { BaseFilesList } from '../adapters/base';

interface UseUploaderReturn {
	triggerRef: React.RefObject<HTMLElement>;
	dropZoneRef: React.RefObject<HTMLElement>;
	files: BaseFilesList;
	uploader: Uploader;
	uploading: boolean;
	progress: number;
	errors: string[];
	openDialog: () => void;
	clean: () => void;
}

export /*bundle*/ function useUploader(specs: IUploaderSpecs): UseUploaderReturn {
	const triggerRef = React.useRef<HTMLElement>(null);
	const dropZoneRef = React.useRef<HTMLElement>(null);

	const [uploader] = React.useState(() => new Uploader(specs));
	const [uploading, setUploading] = React.useState(false);
	const [progress, setProgress] = React.useState(0);
	const [errors, setErrors] = React.useState<string[]>([]);

	React.useEffect(() => {
		if (!triggerRef.current) return;

		uploader.create(triggerRef.current, dropZoneRef.current ?? undefined);

		const handleChange = () => {
			setUploading(uploader.fetching);
			setProgress(
				uploader.files.total > 0 ? Math.round((uploader.files.items.size / uploader.files.total) * 100) : 0
			);
		};

		const handleError = () => {
			setErrors([...uploader.errors]);
		};

		uploader.on(UploaderEvents.Change, handleChange);
		uploader.on(UploaderEvents.Error, handleError);
		uploader.on(UploaderEvents.LoadEnd, handleChange);

		return () => {
			uploader.destroy();
		};
	}, [uploader]);

	return {
		triggerRef,
		dropZoneRef,
		files: uploader.files.items,
		uploader,
		uploading,
		progress,
		errors,
		openDialog: uploader.openDialog,
		clean: uploader.clean
	};
}

