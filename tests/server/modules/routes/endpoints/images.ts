import type { Application, Request, Response } from 'express';
import * as multer from 'multer';
import { FileManager } from '../helper/file-manager';
import * as fs from 'fs';
import * as path from 'path';
import { fileExists } from '../helper/file-exists';
const FOLDER = 'files';

const upload = multer();

interface IRequest extends Request {
	files: any[];
}

export class Images {
	static list(req: Request, res: Response) {
		// TODO: Add logic to list images
	}

	static async get(req: Request, res: Response) {
		const image = path.join(__dirname, FOLDER, req.params.id);
		console.log(2, image);
		try {
			// Check if file exists
			await fileExists(image);

			// Set the correct headers to serve the image file
			res.setHeader('Content-Type', 'image/jpeg'); // Adjust the content type as necessary
			res.sendFile(image);
		} catch (error) {
			if (error.code === 'ENOENT') {
				return res.status(404).json({ status: 'error', message: 'Image not found' });
			}
			console.error('Error serving the image:', error);
			return res.status(500).json({ status: 'error', message: 'Internal server error' });
		}
	}

	static delete(req: Request, res: Response) {
		// TODO: Add logic to delete image
	}

	static async upload(req: IRequest, res: Response) {
		const folder = req.body.folder ? `${FOLDER}/${req.body.folder}` : `${FOLDER}/default`;

		const files: string[] = await FileManager.addFiles(folder, req.files);
		// const files = req.files.map((file: any) => file.filename);
		const output = files.map(item => item.replace(/\\/g, '/'));
		res.json({
			status: 'success',
			data: {
				album: 'default',
				output,
			},
		});
	}

	static setup(app: Application) {
		app.get('/images', Images.list);
		app.get('/images/:id', Images.get); // For getting a single image
		app.delete('/images/:id', Images.delete); // For deleting a single image
		app.post('/images/upload', upload.array('images'), Images.upload); // renamed to uploadImages
	}
}
