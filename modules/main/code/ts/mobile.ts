import { ReactiveModel } from '@beyond-js/reactive/model';
import { ICamera } from './i-camera';
import { PendingPromise } from '@beyond-js/kernel/core';
import { getUrl } from './file-manager';
import { IPublishParams, IResponse } from './interfaces';
import { MediaFiles } from './files';
import { XHRLoader } from './xhr';

declare global {
    interface Navigator {
        camera?: {
            getPicture: (
                onSuccess: (response: string) => void,
                onError: (error: string) => void,
                options?: any
            ) => void;
        };
    }
}

export class MediaCameraDevice extends ReactiveModel<ICamera> implements ICamera {
    #source;
    #selector;
    readonly PLATFORM: string = 'MOBILE';
    private static instance: MediaCameraDevice;
    #files: MediaFiles;
    #DEFAULT_OPTIONS = {
        // Some common settings are 20, 50, and 100
        quality: 80,
        destinationType: globalThis.Camera?.DestinationType?.FILE_URI,
        // In this app, dynamically set the picture source, Camera or photo gallery
        sourceType: 1, // 0 PHOTOLIBRARY, 1 CAMERA, 2 SAVEDPHOTOALBUM
        encodingType: globalThis.Camera?.EncodingType.JPEG,
        mediaType: globalThis.Camera?.MediaType.PICTURE,
        allowEdit: false,
        correctOrientation: true,
    };

    constructor() {
        super();
        this.#files = new MediaFiles(this, {});
    }

    #promise;
    get isReady() {
        return !!globalThis.Camera;
    }
    get source() {
        return this.#source;
    }

    #sourceType = 0;
    get sourceType() {
        return this.#sourceType;
    }
    set sourceType(value: number) {
        if (this.#sourceType === value) return;
        this.#sourceType = value;
    }

    #mediaType = globalThis.Camera?.MediaType.PICTURE; // default
    get mediaType() {
        return this.#mediaType;
    }
    set mediaType(value: number) {
        if (this.#mediaType === value) return;
        this.#mediaType = value;
    }

    set source(value) {
        this.#source = value;
    }

    onSuccess = async function successCallback(data: string) {
        const response = await this.#files.getMobileUrl(data);
        this.#promise.resolve(response);
        this.#promise = undefined;
    };

    onFail = (message: string) => {
        console.error('Failed because: ' + message);
        this.#promise.reject();
        this.#promise = undefined;
    };

    /**
     *
     * @param srcType number 1 = camera, 0 = photolibrary
     * @returns
     */
    setOptions = overwrites => {
        return { ...this.#DEFAULT_OPTIONS, ...overwrites };
    };

    getPicture = options => {
        if (this.#promise) return this.#promise;
        this.#promise = new PendingPromise();
        navigator.camera?.getPicture(response => this.onSuccess(response), this.onFail, this.setOptions(options));
        return this.#promise;
    };

    openGallery(selector: Element) {
        this.#selector = selector;
        return this.getPicture({ sourceType: 0 });
    }

    public static getInstance(): MediaCameraDevice {
        if (!MediaCameraDevice.instance) {
            MediaCameraDevice.instance = new MediaCameraDevice();
        }
        return MediaCameraDevice.instance;
    }

    publish = async (url, params: IPublishParams) => {
        try {
            const form = new FormData();
            const collection = this.#files;
            const name = collection.total > 1 ? `${params.name}[]` : params.name;
            collection.entries.forEach(item => {
                form.append(name, item.blob, item.name);
            });

            for (let param in params) {
                if (!params.hasOwnProperty(param)) continue;

                form.append(param, params[param]);
            }
            const xhr = new XHRLoader();

            const response = await xhr.upload(form, url);
            this.#files = new MediaFiles(this, {});
            return response.json();
        } catch (error) {
            console.error(error);
        }
    };
}

export const MobileMediaDevice = MediaCameraDevice.getInstance();
