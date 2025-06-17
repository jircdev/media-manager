import type { Uploader } from '../';
import type { WebFilesUploader } from '../adapters/web';

export class DraggableUploader {
	#parent: Uploader;
	#files: WebFilesUploader;
	#currentElement?: HTMLElement;
	#boundDrop: (event: DragEvent) => void;
	#boundDragOver: (event: DragEvent) => void;

	constructor(parent: Uploader, files: WebFilesUploader) {
		this.#parent = parent;
		this.#files = files;
		this.#boundDrop = this.onDrop.bind(this);
		this.#boundDragOver = this.onDragOver.bind(this);
	}

	onDrop = (event: DragEvent) => {
		event.preventDefault();
		const { dataTransfer } = event;

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
	 * @param {HTMLElement} el - The element to make draggable (input, div, etc)
	 */
	add(el: HTMLElement) {
		if (this.#currentElement) this.remove();
		this.#currentElement = el;
		el.addEventListener('drop', this.#boundDrop);
		el.addEventListener('dragover', this.#boundDragOver);
	}

	/**
	 * Remove the drag & drop events from the current element, if any
	 */
	remove() {
		if (!this.#currentElement) return;
		this.#currentElement.removeEventListener('drop', this.#boundDrop);
		this.#currentElement.removeEventListener('dragover', this.#boundDragOver);
		this.#currentElement = undefined;
	}
}
