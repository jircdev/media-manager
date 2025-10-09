import * as React from 'react';
import { UploaderEvents, IUploaderSpecs } from '../types';
import { Uploader } from '../index';
import { BaseFilesList } from '../adapters/base';

interface UseUploaderReturn {
	triggerRef: React.RefObject<HTMLElement>;
	dropZoneRef: React.RefObject<HTMLElement>;
	files: BaseFilesList;
	uploader: Uploader;
	uploading: boolean;
	progress: number;
	errors: string[];
	openDialog: () => void;
	clean: () => void;
	count: number;
}

export /*bundle*/ function useUploader(specs: IUploaderSpecs): UseUploaderReturn {
	const triggerRef = React.useRef<HTMLElement>(null);
	const dropZoneRef = React.useRef<HTMLElement>(null);
	const [uploader] = React.useState(() => new Uploader(specs));
	const [uploading, setUploading] = React.useState(false);
	const [progress, setProgress] = React.useState(0);
	const [errors, setErrors] = React.useState<string[]>([]);
	const [count, setCount] = React.useState(0);
	React.useEffect(() => {
		if (!triggerRef.current) return;

		uploader.create(triggerRef.current, dropZoneRef.current ?? undefined);

		const handleChange = () => {
			setUploading(uploader.fetching);
			setCount(count => count + 1);
			setProgress(
				uploader.files.total > 0 ? Math.round((uploader.files.items.size / uploader.files.total) * 100) : 0
			);
		};

		const handleError = () => {
			setErrors([...uploader.errors]);
		};

		uploader.on(UploaderEvents.Change, handleChange);
		uploader.on(UploaderEvents.Error, handleError);
		uploader.on(UploaderEvents.LoadEnd, handleChange);

		return () => {
			uploader.destroy();
		};
	}, [uploader]);

	return {
		triggerRef,
		dropZoneRef,
		files: uploader.files.items,
		uploader,
		uploading,
		count,
		progress,
		errors,
		openDialog: uploader.openDialog,
		clean: uploader.clean
	};
}
