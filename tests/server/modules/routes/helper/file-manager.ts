import { promises as fs } from 'fs';
import * as path from 'path';
export class FileManager {
	/**
	 *
	 * @param path /path/to/file
	 */
	static async createDirectory(path) {
		try {
			await fs.mkdir(path, { recursive: true });
		} catch (e) {
			console.error(e);
		}
	}

	static async deleteFile(path) {
		try {
			await fs.unlink(path);
		} catch (e) {
			console.error(e);
		}
	}
	static async addFiles(directoryPath, images): Promise<string[]> {
		try {
			// Asegurarse de que el directorio exista
			await this.createDirectory(directoryPath);

			const promises = [];
			const directories = [];
			// Iterar sobre las imágenes y copiarlas al directorio
			for (const image of images) {
				const imageFileName = path.basename(image.originalname);
				const destinationPath = path.join(directoryPath, imageFileName);

				// Copiar la imagen al destino
				directories.push(destinationPath);
				promises.push(fs.writeFile(destinationPath, image.buffer));
			}

			await Promise.all(promises);
			return directories;
		} catch (e) {
			console.error('Error al agregar imágenes:', e);
			return [];
		}
	}
}
