/**
 * File: inputs/input-handler.ts
 * Encapsula el <input type="file"> y expone eventos normalizados
 */

import { ReactiveModel } from '@beyond-js/reactive/model';

export interface IInputHandlerSpecs {
	multiple?: boolean;
	accept?: string | string[];
	capture?: boolean | string;
	trigger: string | HTMLElement; // selector o elemento que dispara el diálogo
}

export interface IInputHandlerEvents {
	onFiles?: (files: File[]) => void;
	onError?: (error: Error) => void;
}

export class InputHandler extends ReactiveModel<IInputHandlerEvents> {
	#input: HTMLInputElement;
	#trigger: HTMLElement;
	#specs: IInputHandlerSpecs;

	constructor(specs: IInputHandlerSpecs) {
		super();
		this.#specs = specs;

		// Guard clauses
		if (!specs.trigger) {
			throw new Error('InputHandler requires a trigger element or selector.');
		}

		this.#trigger = typeof specs.trigger === 'string' ? document.querySelector(specs.trigger) : specs.trigger;

		if (!this.#trigger) {
			throw new Error('Trigger element not found.');
		}

		// Crear input oculto
		this.#input = document.createElement('input');
		this.#input.type = 'file';
		this.#input.style.display = 'none';

		if (specs.multiple) this.#input.multiple = true;
		if (specs.accept) {
			this.#input.accept = Array.isArray(specs.accept) ? specs.accept.join(',') : specs.accept;
		}
		if (specs.capture) {
			(this.#input as any).capture = specs.capture;
		}

		this.#input.addEventListener('change', this.#onChange);
		this.#trigger.addEventListener('click', this.open);

		//insert after the trigger
		this.#trigger.after(this.#input);
	}

	#onChange = () => {
		const files = this.#input.files ? Array.from(this.#input.files) : [];
		if (!files.length) return;

		try {
			this.trigger('onFiles', files);
		} catch (error) {
			this.trigger('onError', error as Error);
		} finally {
			this.#input.value = ''; // reset
		}
	};

	open = (): void => {
		this.#input.click();
	};

	destroy(): void {
		this.#input.removeEventListener('change', this.#onChange);
		this.#trigger.removeEventListener('click', this.open);
		if (this.#input.parentNode) {
			this.#input.parentNode.removeChild(this.#input);
		}
	}
}
