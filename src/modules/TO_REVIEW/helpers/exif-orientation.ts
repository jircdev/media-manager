/**
 * Extracts the EXIF Orientation value from a JPEG image's binary data.
 *
 * The EXIF Orientation tag (0x0112) indicates the correct orientation of the image
 * (e.g. normal, rotated 90°, 180°, etc.). This is especially important for displaying
 * images taken on mobile devices where the physical rotation of the camera is stored
 * as metadata instead of modifying the pixel data.
 *
 * @param {ArrayBuffer} arrayBuffer - The binary content of a JPEG image.
 * @returns {number} A number from 1 to 8 representing the orientation according to the EXIF standard:
 *  - 1: Normal (no rotation)
 *  - 3: Rotated 180°
 *  - 6: Rotated 90° clockwise
 *  - 8: Rotated 90° counterclockwise
 *  - Other values may exist but are less commonly used.
 *  - Returns 1 if the orientation tag is not present, if the file is not a JPEG,
 *    or if parsing fails.
 *
 * @example
 * const buffer = await file.arrayBuffer();
 * const orientation = getExifOrientation(buffer);
 * if (orientation === 6) {
 *   // Rotate image 90° clockwise
 * }
 */
export function getExifOrientation(arrayBuffer: ArrayBuffer): number {
	const view = new DataView(arrayBuffer);
	if (view.getUint16(0, false) !== 0xffd8) return 1; // Not JPEG
	let offset = 2;
	const length = view.byteLength;

	while (offset < length) {
		if (view.getUint16(offset + 2, false) <= 8) return 1;
		const marker = view.getUint16(offset, false);
		offset += 2;

		if (marker === 0xffe1) {
			if (view.getUint32((offset += 2), false) !== 0x45786966) return 1; // "Exif"
			const little = view.getUint16((offset += 6), false) === 0x4949;
			offset += view.getUint32(offset + 4, little);
			const tags = view.getUint16(offset, little);
			offset += 2;

			for (let i = 0; i < tags; i++) {
				if (view.getUint16(offset + i * 12, little) === 0x0112) {
					return view.getUint16(offset + i * 12 + 8, little);
				}
			}
		} else if ((marker & 0xff00) !== 0xff00) break;
		else offset += view.getUint16(offset, false);
	}

	return 1;
}
