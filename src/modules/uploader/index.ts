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

		this.#files = FilesUploader.getInstance();
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
		this.#draggable = new DraggableUploader();
		this.#draggable.add(draggableSelector);
	}

	async #processFiles(files: IBaseFile[]) {
		for (const file of files) {
			try {
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
		this.#draggable?.destroy();

		this.#files.off(UploaderEvents.Change, this.#listenChanges);
		this.#files.off(UploaderEvents.LoadEnd, this.#filesLoaded);
	};
}
