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
