import { ReactiveModel } from '@beyond-js/reactive/model';
import { MediaFiles } from './files';

export class InputFile extends ReactiveModel {
    #input = document.createElement('input');
    #errors;
    #selector: Element;
    #files: MediaFiles;

    get files() {
        return this.#files;
    }

    constructor(selector: HTMLInputElement, files: MediaFiles, specs = {}) {
        super();
        this.#selector = selector;
        this.#files = files;
        this.#files.on('error', this.getErrors);
        this.#files.on('loadend', this.filesLoaded);
        this.setAttributes(specs);
        if (selector) this.create();
    }
    filesLoaded = () => this.triggerEvent('loadend');
    pictureLoaded = () => this.triggerEvent('pictureLoaded');
    pictureLoading = () => this.triggerEvent('pictureLoading');
    // getErrors = () => (this.#errors = this.files.errors);
    getErrors = () => console.log('error');

    openDialog = () => {
        this.#input.click();
    };
    setAttributes = specs => {
        if (!specs) specs = {};

        let attrs = {
            type: 'file',
            style: 'display:none',
            name: 'input_upload',
            ...specs,
        };

        for (let prop in attrs) {
            this.#input.setAttribute(prop, attrs[prop]);
        }
    };

    clean = async () => {
        return this.#files.clean();
        // await this.#mobileFiles.clean();
    };

    #onChangeInput = async event => {
        await this.clean();
        const target = event.currentTarget;
        this.#files.total = target.files.length;
        this.#files.readLocal(target.files);
    };

    create() {
        /**
         * Adds de click and change events into the input file
         */
        const addListeners = () => {
            if (!this.#selector) return;
            this.#selector.addEventListener('click', this.openDialog);
            this.#input.addEventListener('change', this.#onChangeInput);
        };

        this.#selector.after(this.#input);
        addListeners();
    }
}
