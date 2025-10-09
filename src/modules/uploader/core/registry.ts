// core/registry.ts
import { IFileValidator, IFileProcessor } from './types';
// registry.ts (already exists, unchanged except clarifying return types)
export class Registry {
	static validators: Record<string, new (options?: any) => IFileValidator> = {};
	static processors: Record<string, new (options?: any) => IFileProcessor> = {};

	static registerValidator(name: string, validator: new (options?: any) => IFileValidator) {
		this.validators[name] = validator;
	}

	static registerProcessor(name: string, processor: new (options?: any) => IFileProcessor) {
		this.processors[name] = processor;
	}

	static getValidator(name: string, options?: any): IFileValidator | undefined {
		const V = this.validators[name];
		return V ? new V(options) : undefined;
	}

	static getProcessor(name: string, options?: any): IFileProcessor | undefined {
		const P = this.processors[name];
		return P ? new P(options) : undefined;
	}
}
