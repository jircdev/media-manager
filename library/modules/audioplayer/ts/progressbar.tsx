import React, {useEffect, useState, useRef} from 'react';
import {useComponentAudioContext} from './context';

export function ProgressBar() {
	const ref = useRef<HTMLInputElement>(null);
	const {
		audio,
		setCurrentTime,
		setPlaying,
		data: {duration},
	} = useComponentAudioContext();
	const [value, setValue] = useState(0);

	useEffect(() => {
		const timeUpdateListener = () => {
			const currentTime = audio.currentTime;
			setValue(currentTime);
		};
		const onEnded = event => {
			setPlaying(false);
			setValue(0.1);
			setCurrentTime(0.1);
		};
		audio.addEventListener('timeupdate', timeUpdateListener);
		audio.addEventListener('ended', onEnded);

		return () => {
			audio.removeEventListener('timeupdate', timeUpdateListener);
		};
	}, [audio, duration]);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.stopPropagation();
		const desiredTime = parseFloat(event.currentTarget.value);

		for (let i = 0; i < audio.buffered.length; i++) {
			if (audio.buffered.start(i) <= desiredTime && audio.buffered.end(i) >= desiredTime) {
				audio.currentTime = desiredTime;

				setValue(desiredTime);
				return;
			}
		}
		console.warn('Desired time not in buffered range', audio.buffered.length);
	};

	return (
		<input
			type="range"
			name="rang"
			onClick={onChange}
			onChange={onChange}
			title="audio duration"
			value={value}
			ref={ref}
			max={duration}
		/>
	);
}
