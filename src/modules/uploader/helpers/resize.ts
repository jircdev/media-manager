import { getExifOrientation } from './exif-orientation';

export interface IResizeSpecs {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface IResizedImage {
	src: string;
	width: number;
	height: number;
	orientation: number;
}

/**
 * Resizes and re-encodes an image given its URL.
 *
 * This function downloads an image, detects its EXIF orientation metadata, applies basic rotation,
 * resizes it proportionally to fit within specified maxWidth and maxHeight, and returns a base64-encoded version
 * in the selected format.
 *
 * **Limitations:**
 * - Transparency is lost when using `image/jpeg` (default). Use `image/png` if you need transparency.
 * - Some browsers may not support `image/webp` or `OffscreenCanvas`.
 * - EXIF orientation support is limited to 1 (normal), 3, 6, and 8.
 * - The original format is not preserved unless explicitly set via `outputType`.
 *
 * @param {string} url - The image URL to load.
 * @param {IResizeSpecs} specs - Optional resizing and output settings.
 * @returns {Promise<IResizedImage>} A resized, re-encoded image result.
 */
export async function resizePicture(url: string, specs?: IResizeSpecs): Promise<IResizedImage> {
	specs = specs || {};
	const maxWidth = specs.maxWidth || 800;
	const maxHeight = specs.maxHeight || maxWidth / (4 / 3);
	const quality = specs.quality || 0.8;

	// Default to JPEG if not provided
	const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
	const outputType = supportedTypes.includes(specs.outputType as string) ? specs.outputType! : 'image/jpeg';

	// Download the image as Blob and ArrayBuffer
	const response = await fetch(url);
	const blob = await response.blob();
	const arrayBuffer = await blob.arrayBuffer();

	// Extract EXIF orientation metadata
	const orientation = getExifOrientation(arrayBuffer);

	// Create image source (ImageBitmap or <img> element fallback)
	let imageBitmap: ImageBitmap | HTMLImageElement;
	try {
		if ('createImageBitmap' in window) {
			imageBitmap = await createImageBitmap(blob, {
				imageOrientation: 'none'
			} as any);
		} else {
			throw new Error();
		}
	} catch {
		imageBitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});
	}

	let width = imageBitmap.width;
	let height = imageBitmap.height;

	// Proportional resize based on aspect ratio
	if (width < height && height > maxHeight) {
		width = Math.round((width * maxHeight) / height);
		height = maxHeight;
	} else if (width >= height && width > maxWidth) {
		height = Math.round((height * maxWidth) / width);
		width = maxWidth;
	}

	// Prepare canvas
	const useOffscreen = typeof OffscreenCanvas !== 'undefined';
	let canvas: HTMLCanvasElement | OffscreenCanvas;

	canvas = useOffscreen ? new OffscreenCanvas(width, height) : document.createElement('canvas');

	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	if (!ctx) throw new Error('Unable to get 2D context');

	// Apply basic EXIF rotation
	switch (orientation) {
		case 3:
			ctx.translate(width, height);
			ctx.rotate(Math.PI);
			break;
		case 6:
			[width, height] = [height, width];
			canvas.width = width;
			canvas.height = height;
			ctx.translate(width, 0);
			ctx.rotate(Math.PI / 2);
			break;
		case 8:
			[width, height] = [height, width];
			canvas.width = width;
			canvas.height = height;
			ctx.translate(0, height);
			ctx.rotate(-Math.PI / 2);
			break;
		default:
			if (orientation !== 1) {
				console.warn(`Unsupported EXIF orientation: ${orientation}`);
			}
	}

	ctx.drawImage(imageBitmap, 0, 0, width, height);

	// Export canvas as base64-encoded image
	let src: string;
	if (canvas instanceof OffscreenCanvas) {
		const finalBlob = await canvas.convertToBlob({
			type: outputType,
			quality
		});
		src = await new Promise<string>(resolve => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.readAsDataURL(finalBlob);
		});
	} else {
		src = (canvas as HTMLCanvasElement).toDataURL(outputType, quality);
	}

	return { src, width, height, orientation };
}
