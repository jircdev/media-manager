import React from 'react';
import {IAudioInterface} from '../types/IAudioInterface';

type TResponse = {
	ready: boolean;
	audio: HTMLAudioElement;
	buffer: AudioBuffer;
	audioRef: React.MutableRefObject<HTMLAudioElement>;
	data: IAudioInterface;
	error: Error;
};

export function useAudio(src): TResponse {
	const audioRef = React.useRef(null);
	const [audio, setAudio] = React.useState<TResponse['audio']>(null);
	const [buffer, setBuffer] = React.useState<AudioBuffer>();
	const [data, setData] = React.useState<IAudioInterface>({src});
	const [error, setError] = React.useState<Error>(false);
	const ref = audioRef.current;

	React.useEffect(() => {
		try {
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
					console.warn('error', error);
					setError(true);
				});
				audio.src = src;
				audio.load();
			});
		} catch (e) {
			console.error(e.message);
			setError(true);
		}
	}, [src]);

	return {
		ready: audio && buffer,
		audioRef: ref,
		buffer,
		audio,
		data,
		error,
	};
}
