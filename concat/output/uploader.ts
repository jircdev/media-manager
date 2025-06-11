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
			await this.#files.readLocal(target.files ?? []);
			this.fetching = false;
			this.trigger(UploaderEvents.Change);
		}, 0);
	};
}
