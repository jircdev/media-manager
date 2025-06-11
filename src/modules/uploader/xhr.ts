import { ReactiveModel } from '@beyond-js/reactive/model';
import { PendingPromise } from '@beyond-js/pending-promise/main';

/* ──────────────────────────── tipos auxiliares ─────────────────────────── */

interface IHeaderSpecs {
	bearer?: string;
	[key: string]: string | number | boolean;
}

export interface IUploadOptions {
	headers?: IHeaderSpecs;
	onProgress?: (percent: number, loaded: number, total: number) => void;
	signal?: AbortSignal;
}

/* ────────────────────────────── XHRLoader ──────────────────────────────── */

/**
 * Multipart/form-data uploader with real progress events, cancellation support
 * and bearer-token authentication. Uses **XMLHttpRequest** so progress events
 * are available in every browser.
 *
 * `upload()` returns a {@link PendingPromise} which can be resolved, rejected,
 * or cancelled internally. A successful upload resolves with a `Response`-like
 * object; an abort resolves with `false`; network/errors reject.
 */
export /*bundle*/ class XHRLoader extends ReactiveModel<XHRLoader> {
	private xhr?: XMLHttpRequest;
	private promise?: PendingPromise<Response | false>;
	private _progress = 0;
	private _uploaded = false;
	private _aborted = false;
	private _error: any = null;
	#bearer?: string;
	#logger: (msg: string, ...rest: any[]) => void;

	constructor(logger: (msg: string, ...rest: any[]) => void = console.log) {
		super();
		this.#logger = process.env.NODE_ENV === 'production' ? () => void 0 : logger;
	}

	/* ────────── getters ────────── */

	get progress(): number {
		return this._progress;
	}
	get uploading(): boolean {
		return !!this.promise && !this._uploaded && !this._aborted;
	}
	get isUploaded(): boolean {
		return this._uploaded;
	}
	get hasError(): boolean {
		return !!this._error;
	}
	get isAborted(): boolean {
		return this._aborted;
	}

	/* ─────────── helpers ────────── */

	bearer(token?: string): this {
		if (token) this.#bearer = token;
		return this;
	}

	private buildHeaders(specs: IHeaderSpecs = {}): Record<string, string> {
		const headers: Record<string, string> = {};
		const bearer = specs.bearer ?? this.#bearer;
		if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

		Object.keys(specs).forEach(key => {
			if (key === 'bearer') return;
			headers[key] = String(specs[key]);
		});
		return headers;
	}

	/* ──────────── main API ─────────── */

	upload(
		data: FormData,
		url: string,
		{ headers, onProgress, signal }: IUploadOptions = {}
	): PendingPromise<Response | false> {
		if (this.uploading) throw new Error('An upload is already in progress');

		/* Reset state */
		this._progress = 0;
		this._uploaded = false;
		this._aborted = false;
		this._error = null;
		this.trigger('change');

		this.promise = new PendingPromise<Response | false>();
		this.xhr = new XMLHttpRequest();
		const xhr = this.xhr;

		/* External AbortSignal */
		if (signal && signal.aborted) xhr.abort();
		signal?.addEventListener('abort', () => xhr.abort(), { once: true });

		/* Configure XHR */
		xhr.open('POST', url, true);
		Object.entries(this.buildHeaders(headers)).forEach(([k, v]) => xhr.setRequestHeader(k, v));

		/* Progress */
		xhr.upload.onprogress = e => {
			if (e.lengthComputable) {
				this._progress = Math.round((e.loaded * 100) / e.total);
				onProgress?.(this._progress, e.loaded, e.total);
				this.trigger('change');
			}
		};

		/* Success */
		xhr.onload = () => {
			if (xhr.status < 200 || xhr.status >= 300) {
				this._error = new Error(`Upload failed with status ${xhr.status}`);
				this.promise!.reject(this._error);
				this.trigger('change');
				return;
			}
			this._uploaded = true;
			this._progress = 100;
			this.trigger('change');

			/* Convert XHR response → Fetch-like Response */
			const resHeaders = new Headers();
			xhr.getAllResponseHeaders()
				.trim()
				.split(/[\r\n]+/)
				.forEach(line => {
					const [header, ...vals] = line.split(': ');
					if (header) resHeaders.append(header, vals.join(': '));
				});

			const response = new Response(xhr.response, {
				status: xhr.status,
				statusText: xhr.statusText,
				headers: resHeaders
			});

			this.promise!.resolve(response);
		};

		/* Error */
		xhr.onerror = ev => {
			this._error = new Error('Network error');
			this.#logger('XHRLoader network error', ev);
			this.promise!.reject(this._error);
			this.trigger('change');
		};

		/* Abort */
		xhr.onabort = () => {
			this._aborted = true;
			this.promise!.resolve(false); // resolved as "cancelled"
			this.trigger('change');
		};

		/* Send */
		xhr.send(data);
		return this.promise;
	}

	/**
	 * Aborts the current upload and resolves the internal promise with `false`.
	 */
	abort(): void {
		if (this.xhr && this.uploading) {
			this.xhr.abort();
		}
	}
}
