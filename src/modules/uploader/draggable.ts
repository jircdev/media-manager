import { ReactiveModel } from '@beyond-js/reactive/model';
import type { Uploader } from '.';
import type { WebFilesUploader } from './files/web';

export class DraggableUploader {
    #parent: Uploader;
    #files: WebFilesUploader;

    constructor(parent: any) {
        this.#parent = parent;
        this.#files = parent.files;
    }

    onDrop = (event: DragEvent) => {
        event.preventDefault();
        const { dataTransfer } = event;
        console.log(19, event);
        if (!dataTransfer.items.length) {
            return;
        }
        const files: File[] = [];
        for (let i = 0; i < dataTransfer.items.length; ++i) {
            const file = dataTransfer.items[i].getAsFile();
            if (file) {
                files.push(file);
            }
        }

        this.#files.readLocal(files);
    };

    /**
     * This event runs only when are files on the draggable area.
     * @param event
     */
    onDragOver = (event: DragEvent) => {
        event.preventDefault();
    };

    /**
     * Add the drag & drop events to the control
     * @param {HTMLInputElement} selector
     */
    add(selector: HTMLInputElement) {
        selector.ondrop = this.onDrop;
        selector.ondragover = this.onDragOver;
    }
}
