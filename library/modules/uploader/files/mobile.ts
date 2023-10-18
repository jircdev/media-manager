import { ReactiveModel } from '@beyond-js/reactive/model';

export class MobileFilesUploader extends ReactiveModel {
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
        this.files = new Map();
        this._loaded = 0;
    };

    getFiles = async (data: any) => {
        this.clean();

        this.base64 = data.url;
        this.triggerEvent('loading');

        /**
         * todo: @julio check
         */
        const [dir, filename] = data.name.split('com.jidadesarrollos.bovino/cache/');
        this.files.set(filename, data.url);
        this.triggerEvent('loadend');
    };

    get entries() {
        return this.files;
    }

    get total() {
        return this.files.size;
    }
}
