import { PendingPromise } from '@beyond-js/kernel/core';
import { ReactiveModel } from '@beyond-js/reactive/model';

export class XHRLoader extends ReactiveModel {
    private promise: PendingPromise<any>;
    private uploaded: boolean;
    private progress: number;
    private error: boolean;

    constructor() {
        super();
        this.promise = undefined;
        this.uploaded = false;
        this.progress = 0;
        this.error = false;
    }

    get uploading(): boolean {
        return !!this.promise;
    }

    get isUploaded(): boolean {
        return this.uploaded;
    }

    get uploadProgress(): number {
        return this.progress;
    }

    get hasError(): boolean {
        return this.error;
    }

    private onProgress(event: ProgressEvent): void {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total);
            this.progress = parseInt(percent.toString());
        }

        this.triggerEvent('change');
    }

    private onCompleted(event: ProgressEvent): void {
        this.uploaded = true;
        this.promise.resolve();
        this.triggerEvent('change');

        setTimeout(() => {
            this.promise = undefined;
            this.triggerEvent('change');
        }, 100);
    }

    private onError(event: ProgressEvent): void {
        console.error('Error uploading picture', event);
        this.error = true;
        this.promise.reject();
        this.triggerEvent('change');
    }

    private onAbort(): void {
        this.promise.resolve(false);
        this.triggerEvent('change');
    }

    public async upload(data: FormData, url: string): Promise<Response> {
        try {
            const specs = {
                method: 'post',
                body: data,
            };
            return fetch(url, specs);
        } catch (e) {
            console.error('error', e);
        }
    }

    public abort(): void {
        if (this.promise) {
            this.promise.reject();
            this.triggerEvent('change');
        }
    }
}
