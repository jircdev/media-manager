import { ReactiveModel } from '@beyond-js/reactive/model';
import { MediaFiles } from './files';
import { ICamera } from './i-camera';
import { InputFile } from './input';
import { XHRLoader } from './xhr';
import { IPublishParams, IResponse } from './interfaces';

class MediaDevice extends ReactiveModel<ICamera> implements ICamera {
    private static instance: MediaDevice;

    #selector;
    readonly PLATFORM: string = 'DESKTOP';
    #stream: MediaStream;
    #constraints = {};
    #inputFile: InputFile;
    #files: MediaFiles;
    #promise;
    get isReady() {
        return true;
    }

    constructor() {
        super();
        this.#files = new MediaFiles(this, {});
    }

    private async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
        if (JSON.stringify(this.#constraints) === JSON.stringify(constraints)) return this.#stream;
        this.#constraints = constraints;
        this.#stream = await navigator.mediaDevices.getUserMedia(constraints);
        return this.#stream;
    }

    async activateCamera(constraints: MediaStreamConstraints, selector: HTMLVideoElement) {
        const stream = await this.getUserMedia(constraints);
        this.#stream = stream;
        selector.srcObject = stream;
        this.#selector = selector;
    }

    public static getInstance(): MediaDevice {
        if (!MediaDevice.instance) {
            MediaDevice.instance = new MediaDevice();
        }
        return MediaDevice.instance;
    }
    public desactivateCamera(): void {
        if (!this.#stream) {
            return;
        }

        this.#stream.getTracks().forEach(track => {
            track.stop();
            this.#stream.removeTrack(track);
        });
        if (this.#selector) {
            this.#selector.srcObject = undefined;
            this.#selector = undefined;
        }
        this.#constraints = undefined;
        this.#stream = undefined;
    }
    /**
     *
     * @param options
     * @returns
     */
    public async getPicture(): Promise<Blob> {
        const stream = await this.getUserMedia({ video: true, audio: false });
        const imageCapture = new globalThis.ImageCapture(stream.getVideoTracks()[0]);
        const blob = await imageCapture.takePhoto();
        this.clean();
        return blob;
    }

    private clean() {
        this.#constraints = {};
        if (!this.#stream) {
            return;
        }

        this.#stream.getTracks().forEach(track => {
            track.stop();
            this.#stream.removeTrack(track);
        });
        if (this.#selector) {
            this.#selector.srcObject = undefined;
            this.#selector = undefined;
        }
        this.#stream = undefined;
    }
    public async getVideoStream(): Promise<MediaStream> {
        return await this.getUserMedia({ video: true, audio: false });
    }

    takePicture(options: object): void {}

    openGallery(selector, specs = {}) {}

    upload(url, specs = {}) {
        const form = new FormData();
    }

    setInputFile(input) {
        this.#inputFile = new InputFile(input, this.#files);
        return this.#inputFile;
    }

    publish = async (url, params: IPublishParams) => {
        try {
            const form = new FormData();
            const collection = this.#files;
            const name = collection.total > 1 ? `${params.name}[]` : params.name;
            console.log(1, collection.entries);
            collection.entries.forEach(item => form.append(name, item));

            for (let param in params) {
                if (!params.hasOwnProperty(param)) continue;
                form.append(param, params[param]);
            }
            const xhr = new XHRLoader();
            const response = await xhr.upload(form, url);
            this.#files = new MediaFiles(this, {});
            console.log(1, this.#files.entries);

            return response.json();
        } catch (error) {
            console.error(error);
        }
    };
}

export const DesktopMediaDevice = MediaDevice.getInstance();
