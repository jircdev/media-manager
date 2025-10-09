/**
 * File: adapters/base-files-list.ts
 * Universal file list manager (agnostic to file type).
 */

import { ReactiveModel } from '@beyond-js/reactive/model';
import { FileStatus, IBaseFile } from '../core/types';

export class BaseFilesList extends ReactiveModel<{}> {
	#map = new Map<string, IBaseFile>();
	#total: number = 0;

	get total(): number {
		return this.#total;
	}

	get items(): IBaseFile[] {
		return [...this.#map.values()];
	}

	get map(): Map<string, IBaseFile> {
		return this.#map;
	}

	/**
	 * Add new files to the list. Files are created with "pending" status.
	 */
	addFiles(files: File[]): IBaseFile[] {
		const added: IBaseFile[] = [];

		for (const file of files) {
			const id = crypto.randomUUID();
			const item: IBaseFile = {
				id,
				name: file.name,
				size: file.size,
				type: file.type,
				file,
				status: 'pending'
			};
			this.#map.set(id, item);
			added.push(item);
		}

		this.#total = this.#map.size;
		this.trigger('add', added);
		this.trigger('change', this.items);

		return added;
	}

	/**
	 * Remove a file by ID.
	 */
	remove(id: string): boolean {
		const removed = this.#map.delete(id);
		if (removed) {
			this.#total = this.#map.size;
			this.trigger('remove', id);
			this.trigger('change', this.items);
		}
		return removed;
	}

	/**
	 * Clean all files.
	 */
	async clean(): Promise<void> {
		this.#map.clear();
		this.#total = 0;
		this.trigger('clean');
		this.trigger('change', []);
	}

	/**
	 * Update the status of a file.
	 */
	updateStatus(id: string, status: FileStatus, error?: string): void {
		const item = this.#map.get(id);
		if (!item) return;

		item.status = status;
		if (error) item.error = error;

		this.trigger('update', item);
		this.trigger('change', this.items);
	}
}
