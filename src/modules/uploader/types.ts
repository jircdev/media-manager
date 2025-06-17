// Tipos y eventos expuestos por el uploader (sin lógica de red)

export interface IUploaderSpecs {
	name: string;
	input?: Partial<HTMLInputElement>;
	multiple?: boolean;
	base64?: boolean; // defines if the File object will generate a base64 string
	params?: Record<string, any>;
	accept?: string | string[]; // filtros opcionales por tipo
	type?: string; // categoría predefinida: 'image', 'audio', etc.
	maxSize?: number; // nuevo: en bytes (ej: 5 MB = 5 * 1024 * 1024)
}

export interface IUploaderEvents {
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
