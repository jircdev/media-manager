import * as React from 'react';
import { useUploader } from './control';

interface IProviderValue {
	deleteFile: (name: string) => void;
	clearFiles: () => void;
	files: File[];
	uploadFiles: (files: File[]) => void;
	button: any;
	drag: any;
}
const UploaderContext = React.createContext({} as IProviderValue);

export /*bundle*/ function UploaderProvider({ specs, children }) {
	const { uploadFiles, clearFiles, files, button, drag, deleteFile } = useUploader(specs);

	const value = { deleteFile, clearFiles, files, uploadFiles, button, drag };

	return <UploaderContext.Provider value={value}>{children}</UploaderContext.Provider>;
}
