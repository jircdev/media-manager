// import { mediaDevice } from '@aimpact/media-manager/main';
import { DraggableUploader } from './ui/draggable';
import { ReactiveModel } from '@beyond-js/reactive/model';
import { FilesUploader } from './adapters';
import { BaseFilesList } from './adapters/base';
import { IUploaderSpecs, UploaderEvents } from './types';
import { XHRLoader } from './xhr';

interface IUploader {
	files: BaseFilesList;
}
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
		// if (mediaDevice.type === 'MOBILE') {
		// 	selector.addEventListener('click', mediaDevice.openGallery);
		// }
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
			console.log('si');
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
