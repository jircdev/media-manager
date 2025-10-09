// Tipos y eventos expuestos por el uploader (sin lógica de red)
export type FileStatus = 'pending' | 'validating' | 'ready' | 'uploading' | 'done' | 'error';

export interface IBaseFile {
	id: string;
	name: string;
	size: number;
	type: string;
	file: File;
	previewUrl?: string;
	status: FileStatus;
	error?: string;
	meta?: Record<string, any>;
}
export type ValidatorSpec = IFileValidator | string | { name: string; options?: Record<string, any> };

export type ProcessorSpec = IFileProcessor | string | { name: string; options?: Record<string, any> };

export /*bundle*/ interface IUploaderSpecs {
	multiple?: boolean;
	accept?: string | string[];
	validators?: ValidatorSpec[]; // now supports many
	processors?: ProcessorSpec[]; // now supports many
}

export /*bundle*/ interface IUploaderEvents {
	[UploaderEvents.LoadEnd]?: () => void;
	[UploaderEvents.PictureLoaded]?: () => void;
	[UploaderEvents.PictureLoading]?: () => void;
	[UploaderEvents.Error]?: (error: any) => void;
	[UploaderEvents.Change]?: () => void;
	[UploaderEvents.Clean]?: () => void;
	[UploaderEvents.Delete]?: () => void;
}

export enum UploaderEvents {
	LoadEnd = 'loadend',
	PictureLoaded = 'pictureLoaded',
	PictureLoading = 'pictureLoading',
	Error = 'error',
	Change = 'change',
	Clean = 'clean',
	Delete = 'delete'
}

// core/types.ts

export /*bundle*/ interface IFileValidator {
	validate(file: IBaseFile): Promise<void>;
}

export /*bundle*/ interface IFileProcessor {
	process(file: IBaseFile): Promise<void>;
}
export /*bundle*/ interface IImageFile extends IBaseFile {
	meta: {
		preview: { width: number; height: number };
	};
	toBase64: () => Promise<string>;
}
