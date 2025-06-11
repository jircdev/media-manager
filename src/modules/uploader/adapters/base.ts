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

	validateFile = (file: File) => {
		// Si specs.accept está presente, usarlo para validar
		if (this.#accept) {
			let acceptList: string[] = [];
			if (typeof this.#accept === 'string') {
				acceptList = [this.#accept];
			} else if (Array.isArray(this.#accept)) {
				acceptList = this.#accept;
			}
			const isValid = acceptList.some(accept => {
				// Puede ser un MIME type exacto o extensión
				if (accept.startsWith('.')) {
					return file.name.endsWith(accept);
				} else {
					return file.type === accept;
				}
			});
			if (!isValid) {
				this.#errors.push(`${file.name.replace(INVALID_CHARS, '')} (no permitido por accept)`);
			}
			return isValid;
		}

		// Si no hay tipo registrado, aceptar todo o lanzar error claro
		if (!this.FILE_TYPE[this.#type]) {
			// Puedes cambiar esto a lanzar un error si prefieres:
			// throw new Error(`Tipo de archivo desconocido: ${this.#type}`);
			return true;
		}

		const isValid = !!this.FILE_TYPE[this.#type]?.find(item => item === file.type);
		if (!isValid) {
			this.#errors.push(`${file.name.replace(INVALID_CHARS, '')} (tipo no permitido)`);
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
		// Revocar el objectURL tras emitir file:loaded si no se necesita la vista previa
		URL.revokeObjectURL(src);
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
		await Promise.all(Array.from(fileList).map(file => this.#readFile(file)));
		this.fetching = false;
	};
}
