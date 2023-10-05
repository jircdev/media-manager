import {PendingPromise} from '@beyond-js/kernel/core';
import {ReactiveModel} from '@beyond-js/reactive/model';

export /*bundle */ class XHRLoader extends ReactiveModel<XHRLoader> {
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

	#bearer;
	bearer(bearer: string | undefined) {
		if (bearer) this.#bearer = bearer;
		return this;
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

	getHeaders = (specs: any): Headers => {
		let headers: Headers = new Headers();

		const bearer = specs.bearer || this.#bearer;

		if (bearer) {
			headers.append('Authorization', `Bearer ${bearer}`);
		}
		if (specs.bearer) delete specs.bearer;

		const keys: string[] = Object.keys(specs);
		keys.forEach((key: string): void => {
			if (key === 'bearer') return;
			headers.append(key, specs[key]);
		});
		return headers;
	};

	public async upload(data: FormData, url: string): Promise<Response> {
		try {
			let headers = this.getHeaders({});
			const specs = {
				method: 'post',
				headers,
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
