import React from 'react';
import {IAudioInterface} from '../types/IAudioInterface';

type Response = {
	ready: boolean;
	audio: HTMLAudioElement;
	buffer: AudioBuffer;
	audioRef: React.MutableRefObject<HTMLAudioElement>;
	data: IAudioInterface;
	error: Error;
};

export function useAudio(src, convert): Response {
	const audioRef = React.useRef(null);
	const [audio, setAudio] = React.useState<Response['audio']>(null);
	const [buffer, setBuffer] = React.useState<AudioBuffer>();
	const [ready, setReady] = React.useState<boolean>();
	const [data, setData] = React.useState<IAudioInterface>({src});
	const [error, setError] = React.useState<Error>(false);
	const ref = audioRef.current;

	const getAudioContext = element => {
		return new Promise((resolve, reject) => {
			const audioContext = new AudioContext();
			const reader = new FileReader();
			reader.onload = () => {
				const buffer = reader.result as ArrayBuffer;
				audioContext
					.decodeAudioData(buffer)
					.then(buffer => {
						resolve(audioContext);
						setData({...data, duration: parseFloat(buffer.duration.toFixed(2))});
						setBuffer(buffer);
					})
					.catch(error => {
						reject(error);
					});
			};
			reader.readAsArrayBuffer(element);
		});
	};
	React.useEffect(() => {
		try {
			const isBlob = src instanceof Blob;
			if (isBlob) {
				const audio = new Audio();

				audio.addEventListener('loadedmetadata', () => {
					data.duration = parseFloat(audio.duration.toFixed(2));
					data.fileName = src.name;

					setData(data);
					setAudio(audio);
					getAudioContext(src).then(() => {
						setReady(true);
					});
				});

				audio.addEventListener('error', error => {
					console.warn('error', error);
					setError(true);
				});
				audio.src = URL.createObjectURL(src);
				audio.load();
				return;
			}

			fetch(src).then(async response => {
				if (!response.ok) throw new Error(response.statusText);
				const data: IAudioInterface = {src};

				data.blob = await response.clone().blob();
				try {
					const audioContext = new AudioContext();
					response.arrayBuffer().then(buffer => {
						audioContext.decodeAudioData(buffer).then(audioBuffer => {
							setBuffer(audioBuffer);
						});
					});
				} catch (e) {
					console.error('error getting audio', e);
				}
				data.url = URL.createObjectURL(data.blob);
				const audio = new Audio();

				audio.addEventListener('loadedmetadata', () => {
					data.duration = parseFloat(audio.duration.toFixed(2));
					data.fileName = src.split('/').pop();

					setData(data);
					setAudio(audio);
				});

				audio.addEventListener('error', error => {
					setError(true);
				});
				audio.src = src;
				audio.load();
			});
		} catch (e) {
			console.error('capturado', e.message);
			setError(true);
		}
	}, [src]);

	return {
		ready,
		audioRef: ref,
		buffer,
		audio,
		data,
		error,
	};
}
