import {ReactiveModel} from '@beyond-js/reactive/model';
import {DraggableUploader} from './draggable';
import {BaseFile} from './files/base';
import {FilesUploader} from './files';
import {XHRLoader} from './xhr';
import {mediaDevice} from '@bgroup/media-manager/main';

interface IUploader {
	files: BaseFile;
}
export /*bundle*/ class Uploader extends ReactiveModel<IUploader> {
	#files: BaseFile;

	get files() {
		return this.#files;
	}

	#fileInput = document.createElement('input');
	#selector: HTMLElement;
	#attrs;
	#draggable;

	get draggable() {
		return this.#draggable;
	}
	#control: HTMLElement;
	#specs;
	#errors;
	get errors() {
		return this.#errors;
	}

	constructor(specs: any = {}) {
		super();

		if (!specs.input) specs.input = {};

		/**
		 * Manager of the files
		 * @type {UploadFiles}
		 */

		this.#files = FilesUploader.getInstance(this, specs);

		this.#draggable = new DraggableUploader(this);
		globalThis.up = this;
		this.#files.on('change', this.#listenChanges);
		this.#files.on('items.loaded', this.#updateItems);
		this.#files.on('error', this.getErrors);
		this.#files.on('loadend', this.filesLoaded);
		const params = {...specs.input};
		if (specs.hasOwnProperty('multiple')) params.multiple = specs.multiple;
		this.#specs = specs;
		this.setAttributes(params);
	}

	#listenChanges = () => {
		this.fetching = this.#files.fetching;
		this.ready = this.#files.ready;
		this.triggerEvent();
	};
	setAttributes = specs => {
		if (!specs) specs = {};

		let attrs = {
			type: 'file',
			style: 'display:none',
			name: 'input_upload',
			...specs,
		};
		if (attrs.multiple) this.#fileInput.accept = 'directory/*';

		for (let prop in attrs) {
			this.#fileInput.setAttribute(prop, attrs[prop]);
		}

		this.#attrs = attrs;
	};

	#updateItems = () => {
		this.triggerEvent('items.loaded')
	};
	// };

	openDialog = () => {
		console.log(0.5, 'this');
		this.#fileInput.click();
	};
	filesLoaded = () => this.triggerEvent('loadend');
	pictureLoaded = () => this.triggerEvent('pictureLoaded');
	pictureLoading = () => this.triggerEvent('pictureLoading');
	getErrors = () => (this.#errors = this.files.errors);

	clean = async () => {
		await this.#files.clean();
	};

	delete = (fileName: string) => {
		this.#files.items.delete(fileName);
		this.triggerEvent('item.delete');
	};

	isDrap = () => {
		return this.#draggable.onDragOver();
	}

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

		this.fetching = true;
		const target = event.currentTarget;
		window.setTimeout(async () => {
			this.#files.total = target.files.length;
			await this.#files.readLocal(target.files);
			this.fetching = false;
		}, 0);
	};

	publish = async (additionalParams = {}) => {
		const form = new FormData();
		//const collection = isCamera ? mobileFiles : files;
		const collection = this.#files;

		const specs = this.#specs;
		const name = collection.total > 1 ? `${specs.name}` : specs.name;

		const items = collection.entries.map(item => item);
		form.append(name, JSON.stringify(items));
		collection.entries.forEach(item => form.append(name, item));

		if (!specs.params) specs.params = {};
		const params = {...specs.params, ...additionalParams};

		for (let param in params) {
			if (!params.hasOwnProperty(param)) continue;
			form.append(param, params[param]);
		}
		const xhr = new XHRLoader();
		const response = await xhr.upload(form, specs.url);
		return response.json();
	};
}
