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
