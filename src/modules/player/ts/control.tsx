import * as React from 'react';

export /*bundle*/ function AudioPlayer({src}): JSX.Element {
	const canPlayType = new Audio().canPlayType(src.type);

	const [data, setData] = React.useState({uri: undefined, type: undefined});

	const ref = React.useRef(null);

	const updateState = async () => {
		const audioElement = ref.current;
		try {
			audioElement.load(); // Load the audio file
			audioElement.play(); // Play the audio
		} catch (e) {}
	};

	React.useEffect(() => {
		let reader = new FileReader();
		reader.onload = e => {
			let base64URL = e.target.result;
			let BlobType = src.type.includes(';') ? src.type.substr(0, src.type.indexOf(';')) : src.type;
			setData({uri: base64URL, type: BlobType});
			setTimeout(() => {
				updateState();
			}, 1000);
		};

		reader.readAsDataURL(src);
	}, []);

	const {uri, type} = data;

	return (
		<div className="audio-player">
			<audio controls preload="metadata" ref={ref}>
				<source src={uri} type={type} />
				Your browser does not support the audio element.
			</audio>
		</div>
	);
}
