import { PendingPromise } from '@beyond-js/kernel/core';
import { ReactiveModel } from '@beyond-js/reactive/model';

export class MediaFiles extends ReactiveModel {
    #loaded: number = 0;

    #specs: any;
    #type: string;
    private regExp = /[^\w\d.]/g;
    #errors: any[] = [];
    #promise;
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
    protected _items = new Map();

    get items() {
        return this._items;
    }

    get entries() {
        return [...this._items.values()];
    }

    constructor(parent: any, specs: any) {
        super();
        this.#specs = specs;
        this.#type = specs.type ? specs.type : 'any';
    }

    protected FILE_TYPE = Object.freeze({
        document: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/pdf',
        ],
        image: ['image/png', 'image/jpeg', 'image/gif'],
        json: ['application/json'],
        zip: ['application/x-zip-compressed'],
        audio: [
            'audio/mpeg', // MP3 files
            'audio/ogg', // Ogg Vorbis files
            'audio/wav', // WAV files
            'audio/webm', // WebM audio files
            'audio/aac', // AAC files
            'audio/flac', // FLAC files
        ],
    });

    #onload = (event: any) => {
        if (event.target?.removeEventListener) {
            event.target.removeEventListener('load', this.#onload);
        }

        if (this.#specs.onload && typeof this.#specs.onload === 'function') {
            this.#specs.onload(event);
        }
    };

    #onloadend = (event: any, file: any) => {
        this.#loaded = this.#loaded + 1;

        file.src = event.target.result;
        this.#processFile(file);

        if (event.target?.removeEventListener) {
            event.target.removeEventListener('onloadend', this.#onloadend);
        }
        this.triggerEvent('file.loaded');
        if (this.#loaded === this._items.size) this.triggerEvent('loadend');
        if (this.#specs.onloadend && typeof this.#specs.onloadend === 'function') {
            this.#specs.onload(event);
        }
    };

    #processFile(file: any) {
        const name = file.name.replace(this.regExp, '');
        file = this._items.get(name);
        this._items.set(name, file);
    }

    #onerror = (event: any) => console.error(4, event);

    validate = (file: any) => {
        const isValid = !!this.FILE_TYPE[this.#type].find(item => item === file.type);
        if (!isValid) {
            this.#errors.push(file.name.replace(this.regExp, ''));
        }
        return isValid;
    };

    #readFile = async (file: any) => {
        if (this.#type !== 'any') {
            const isValid = await this.validate(file);
            if (!isValid) {
                this.triggerEvent('error');
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = event => this.#onload(event);
        reader.onloadend = event => this.#onloadend(event, file);
        reader.onerror = event => this.#onerror(event);
        reader.readAsDataURL(file);
    };

    #validateLoad = () => {
        if (this.#loaded === this._items.size) {
        }
    };

    clean = () => {
        this._items = new Map();
        this.#loaded = 0;
    };

    /**
     * Read Local files uploaded from an input file
     *
     * @param fileList
     */
    readLocal = async (fileList: File[]) => {
        const promises = [];
        for (let i = 0; i < fileList.length; ++i) {
            const file = fileList[i];
            this._items.set(file.name.replace(this.regExp, ''), file);
            promises.push(this.#readFile(file));
        }
        await Promise.all(promises);
    };

    getMobileUrl(data) {
        if (this.#promise) return this.#promise;
        this.#promise = new PendingPromise();
        const process = entry => {
            entry.file(file => {
                const reader = new FileReader();
                reader.onloadend = e => {
                    const imgBlob = new Blob([reader.result], { type: file.type });
                    const name = file.name.replace(this.regExp, '');
                    file.blob = imgBlob;
                    this._items.set(name, file);
                    //returns a valid element to show as image
                    this.#promise.resolve(URL.createObjectURL(imgBlob));
                    this.#promise = undefined;
                };

                this._items.set(file.name.replace(this.regExp, ''), file);
                reader.readAsArrayBuffer(file);
            });
        };
        // cordova file plugin
        globalThis.resolveLocalFileSystemURL(data, process);
        return this.#promise;
    }
}
