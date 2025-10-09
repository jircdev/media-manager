import { ReactiveModel } from '@beyond-js/reactive/model';
import type { WebFilesUploader } from '../adapters/web';

export interface IDraggableUploaderEvents {
	onFiles?: (files: File[]) => void;
	onError?: (error: Error) => void;
}

export class DraggableUploader extends ReactiveModel<IDraggableUploaderEvents> {
	#zones = new Set<HTMLElement>();

	#onDropBound: (event: DragEvent) => void;
	#onDragOverBound: (event: DragEvent) => void;

	constructor() {
		super();
		this.#onDropBound = this.#onDrop.bind(this);
		this.#onDragOverBound = this.#onDragOver.bind(this);
	}

	#onDrop(event: DragEvent): void {
		event.preventDefault();

		try {
			const transfer = event.dataTransfer;
			if (!transfer?.items?.length) return;

			const files: File[] = [];
			for (const item of transfer.items) {
				const file = item.getAsFile();
				if (file) files.push(file);
			}

			if (files.length) this.trigger('onFiles', files);
		} catch (error) {
			this.trigger('onError', error as Error);
		}
	}

	#onDragOver(event: DragEvent): void {
		event.preventDefault();
	}

	/** Register an element as a drop zone */
	add(el: HTMLElement): void {
		if (this.#zones.has(el)) return;

		el.addEventListener('drop', this.#onDropBound);
		el.addEventListener('dragover', this.#onDragOverBound);
		this.#zones.add(el);
	}

	/** Unregister a specific drop zone */
	remove(el: HTMLElement): void {
		if (!this.#zones.has(el)) return;

		el.removeEventListener('drop', this.#onDropBound);
		el.removeEventListener('dragover', this.#onDragOverBound);
		this.#zones.delete(el);
	}

	/** Clean all registered zones */
	destroy(): void {
		for (const el of this.#zones) {
			el.removeEventListener('drop', this.#onDropBound);
			el.removeEventListener('dragover', this.#onDragOverBound);
		}
		this.#zones.clear();
	}
}
