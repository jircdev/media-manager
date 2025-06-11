// Tipos y enums para el uploader

export interface IUploaderSpecs {
    url: string;
    name: string;
    input?: Partial<HTMLInputElement>;
    multiple?: boolean;
    params?: Record<string, any>;
    chunked?: boolean; // Soporte de subida fragmentada
    chunkSize?: number; // Tamaño del chunk en bytes
    retries?: number; // Reintentos configurables
}

export interface IUploaderEvents {
    [UploaderEvents.LoadEnd]?: () => void;
    [UploaderEvents.PictureLoaded]?: () => void;
    [UploaderEvents.PictureLoading]?: () => void;
    [UploaderEvents.Error]?: (error: any) => void;
    [UploaderEvents.Change]?: () => void;
}

export enum UploaderEvents {
    LoadEnd = 'loadend',
    PictureLoaded = 'pictureLoaded',
    PictureLoading = 'pictureLoading',
    Error = 'error',
    Change = 'change',
}
