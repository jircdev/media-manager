// processors/image.ts
import { IImageFile, IBaseFile, IFileProcessor } from '../core/types';

export /*bundle*/ class ImageProcessor implements IFileProcessor {
	async process(file: IBaseFile): Promise<void> {
		const previewUrl = URL.createObjectURL(file.file);
		file.previewUrl = previewUrl;
		console.log(0.2, file.previewUrl);
		const dimensions = await this.getDimensions(previewUrl);

		const imageFile = file as IImageFile;
		imageFile.meta = { preview: { width: dimensions.width, height: dimensions.height } };
		imageFile.toBase64 = () => this.toBase64(file.file);
	}

	private getDimensions(src: string): Promise<{ width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve({ width: img.width, height: img.height });
			img.onerror = () => reject(new Error('Could not load image dimensions'));
			img.src = src;
		});
	}

	private toBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = err => reject(err);
			reader.readAsDataURL(file);
		});
	}
}
