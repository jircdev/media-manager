import * as React from 'react';
import { Uploader } from '@aimpact/media-manager/uploader';

export /*bundle*/ function useUploader({ url, name = 'file', multiple = false }) {
	const [uploader, setUploader] = React.useState();
	const [fetching, setFetching] = React.useState();
	const [total, setTotalFiles] = React.useState(0);

	const drag = React.useRef(null);
	const button = React.useRef(null);

	const clearFiles = () => {
		uploader?.clean();
		setTotalFiles(0);
	};

	React.useEffect(() => {
		const uploader = new Uploader({
			url,
			name,
			multiple,
		});

		uploader.create(button.current, drag.current);
		const onChange = () => {
			setTotalFiles(uploader.files.items?.size ?? 0);
			if (uploader.fetching !== fetching) setFetching(uploader.fetching);
		};
		uploader.on('change', onChange);
		setUploader(uploader);

		return () => uploader.off('change', onChange);
	}, [url]);

	const uploadFiles = uploader?.publish;
	const deleteFile = uploader?.delete;

	return {
		uploadFiles,
		clearFiles,
		deleteFile,
		files: uploader?.files.items,
		fetching,
		button,
		drag,
		totalFiles: total,
	};
}
