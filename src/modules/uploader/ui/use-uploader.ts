/* hooks/useUploader.ts
   -------------------------------------------------
   React hook that wires the Uploader, returns the
   refs you must attach to the DOM and exposes a
   `publish` helper plus basic reactive state.
*/
import * as React from 'react';

import { UploaderEvents, IUploaderSpecs } from '../types';
import { Uploader } from '../index';
import { BaseFilesList } from '../adapters/base';

interface UseUploaderReturn {
	triggerRef: React.RefObject<HTMLElement>;
	dropZoneRef: React.RefObject<HTMLElement>;
	publish: (extraParams?: Record<string, any>) => Promise<any>;
	uploading: boolean;
	progress: number; // 0-100
	errors: string[];
	files: BaseFilesList;
}

/**
 * Hook to initialise the Aimpact uploader.
 * - `triggerRef` → element that opens the file dialog.
 * - `dropZoneRef` → element that receives drag-and-drop.
 */
export /*bundle*/ function useUploader(specs: IUploaderSpecs): UseUploaderReturn {
	const triggerRef = React.useRef<HTMLElement>(null);
	const dropZoneRef = React.useRef<HTMLElement>(null);

	const [uploader] = React.useState(() => new Uploader(specs));
	const [uploading, setUploading] = React.useState(false);
	const [progress, setProgress] = React.useState(0);
	const [errors, setErrors] = React.useState<string[]>([]);

	/* Wire DOM refs once mounted */
	React.useEffect(() => {
		if (!triggerRef.current) return;
		uploader.create(triggerRef.current, dropZoneRef.current ?? undefined);

		const handleChange = () => {
			setUploading(uploader.fetching);
			setProgress(
				uploader.files.total ? Math.round((uploader.files.items.size / uploader.files.total) * 100) : 0
			);
		};
		const handleError = () => setErrors([...uploader.errors]);

		uploader.on(UploaderEvents.Change, handleChange);
		uploader.on(UploaderEvents.Error, handleError);

		return () => {
			uploader.destroy();
		};
	}, [uploader]);

	/* Helper to trigger the upload */
	const publish = React.useCallback((extra: Record<string, any> = {}) => uploader.publish(extra), [uploader]);

	return { triggerRef, dropZoneRef, publish, uploading, progress, errors, files: uploader.files };
}
