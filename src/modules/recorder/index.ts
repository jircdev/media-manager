import {Events, PendingPromise} from '@beyond-js/kernel/core';
import {ReactiveModel} from '@beyond-js/reactive/model';
import {IRecorderSpecs} from './interface';
export /*bundle */
class Recorder extends ReactiveModel<Recorder> {
	#initialised = false;
	#source;
	#stream;
	#startTime;
	#initPromise;
	#stopPromise;
	#audioContext;
	#recordingPromise;
	#mediaRecorder: MediaRecorder;

	#chunks: Blob[] = [];
	get chunks() {
		return this.#chunks;
	}
	#status;
	get status() {
		return this.#status;
	}

	#recording = false;
	get recording() {
		return this.#recording;
	}

	#error: string;
	get error() {
		return this.#error;
	}

	get valid() {
		return !this.#error;
	}

	#audio;
	get audio() {
		return this.#audio;
	}

	#analyser;
	get analyser() {
		return this.#analyser;
	}
	#speechRecognition;
	#transcription = '';
	get transcription() {
		return this.#transcription;
	}

	async hasPermissions() {
		return navigator.permissions.query({name: 'microphone' as any});
	}

	#promiseSpeech: PendingPromise<string>;

	#permissions: PermissionStatus;
	#permissionState: 'granted' | 'denied' | 'prompt';
	constructor() {
		super();
		this.init();
	}

	async init() {
		this.#permissions = await navigator.permissions.query({name: 'microphone' as any});
		this.ready = true;
		this.#permissionState = this.#permissions.state;
		this.#permissions.onchange = this.#onChangeStatus.bind(this);
	}

	#onChangeStatus() {
		this.#permissionState = this.#permissions.state;
		this.trigger('change');
	}

	getSpeechRecognition() {
		//@ts-ignore
		this.#speechRecognition = new webkitSpeechRecognition();
		this.#speechRecognition.lang = 'es-ES';
		this.#speechRecognition.continuous = true;
		this.#speechRecognition.interimResults = true;
		// this.#speechRecognition.lang = 'en-US'; // Change this to the desired language
		this.#promiseSpeech = new PendingPromise<string>();
		this.#speechRecognition.onresult = event => {
			let interimTranscript = '';
			let finalTranscript = '';
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if (event.results[i].isFinal) {
					finalTranscript += event.results[i][0].transcript;
					this.#transcription = finalTranscript;
					this.#promiseSpeech.resolve(this.#transcription);
				} else {
					interimTranscript += event.results[i][0].transcript;
				}
			}
		};
		this.#speechRecognition.onerror = event => console.error('error in transcription');

		this.#speechRecognition.start();
	}

	#onDataAvailable = event => {
		if (event.data.size === 0) return;
		this.#chunks.push(event.data);

		this.trigger('dataavailable');
	};

	#startRecording = (stream, specs) => {
		this.#mediaRecorder = new MediaRecorder(stream);
		this.#stream = stream;
		// Create an AudioContext
		this.#audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
		// Create an AnalyserNode
		this.#analyser = this.#audioContext.createAnalyser();
		// Create a source from the stream and connect it to the analyser
		this.#source = this.#audioContext.createMediaStreamSource(stream);

		if (specs.analyser) this.#source.connect(this.#analyser);
		//@ts-ignore

		if (specs.speechRecognition && 'webkitSpeechRecognition' in globalThis) {
			this.getSpeechRecognition();
		}

		this.#mediaRecorder.addEventListener('dataavailable', this.#onDataAvailable);
	};
	async initialise(specs = {}) {
		if (this.#initPromise) return await this.#initPromise;
		this.#initPromise = new PendingPromise<void>();

		globalThis?.navigator.mediaDevices
			.getUserMedia({audio: true})
			.then(stream => this.#startRecording(stream, specs))
			.catch(error => {
				this.#error = error.message;
				this.#initPromise.reject();
			})
			.finally(() => {
				this.#initialised = true;
				this.#initPromise.resolve();
			});

		return this.#initPromise;
	}
	record(specs: IRecorderSpecs = {analyser: true}) {
		try {
			if (this.#recordingPromise) return this.#recordingPromise;
			this.#recordingPromise = new PendingPromise<void>();
			if (this.#recording) {
				throw new Error('Wait for recorder to be stopped and transcription ready');
			}
			this.#status = 'started';
			this.#recording = true;
			this.trigger('change');

			globalThis?.navigator.mediaDevices
				.getUserMedia({audio: true})
				.then(async stream => {
					this.#startRecording(stream, specs);
					this.#recordingPromise.resolve();
					this.#initialised = true;
					this.#mediaRecorder?.start();
				})
				.catch(error => {
					console.error(error);
					this.#error = error.message;
					this.#recordingPromise.reject();
				});

			return this.#recordingPromise;
		} catch (e) {
		} finally {
		}
	}
	stopStream = () => {
		//stopping the capturing request by stopping all the tracks on the active stream
		this.#stream
			.getTracks() //get all tracks from the stream
			.forEach((track) /*of type MediaStreamTrack*/ => track.stop()); //stop each one
	};

	stop() {
		if (!this.#mediaRecorder) {
			console.warn('this.#mediaRecorder no initialize');
			return;
		}
		if (this.#stopPromise) return this.#stopPromise;
		this.#stopPromise = new PendingPromise<any>();

		if (!this.#recording) throw new Error('Recorder is not currently recording');
		this.#status = 'stopped';
		const stop = () => {
			this.#chunks = [];
			this.#recording = false;

			this.#mediaRecorder.addEventListener('stop', async () => {
				const audio = new Blob(this.#chunks, {type: this.#mediaRecorder.mimeType});

				//@ts-ignore
				this.#audio = audio;

				const onFinish = () => {
					this.#stopPromise.resolve(audio);
					this.#stopPromise = undefined;
				};
				if (this.#promiseSpeech) {
					this.#promiseSpeech.then(onFinish);
				} else {
					if (this.#stopPromise) {
						onFinish();
					}
				}

				if (this.#recordingPromise) {
					this.#recordingPromise.resolve(audio);
					this.#recordingPromise = undefined;
				}
				this.stopStream();
				this.#mediaRecorder = undefined;
				this.#stream = undefined;
				this.#initPromise = undefined;
			});

			this.#mediaRecorder?.stop();
			this.#speechRecognition?.stop();

			this.trigger('change');
		};

		this.#initialised ? stop() : this.record().then(stop);
		return this.#stopPromise;
	}
}
