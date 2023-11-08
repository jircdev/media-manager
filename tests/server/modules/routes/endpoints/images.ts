import type { Application, Request, Response } from 'express';
import * as multer from 'multer';
import { promises as fs } from 'fs';
import { fileExists } from '../helper/file-exists';
const FOLDER = 'files';

const storage = multer.diskStorage({
	destination: async function (req, file, cb) {
		const exists = await fileExists(FOLDER);

		try {
			if (!exists) {
				await fs.mkdir(FOLDER);
			}
			cb(null, FOLDER);
		} catch (err) {
			console.log(1, err);
			cb(err, null);
		}
	},
	filename: function (req, file, cb) {
		const extension = file.originalname.split('.').pop();
		cb(null, `${file.fieldname}${Date.now()}.${extension}`);
	},
});

const upload = multer({ storage });

interface IRequest extends Request {
	files: any[];
}

export class Images {
	static list(req: Request, res: Response) {
		// TODO: Add logic to list images
	}

	static getOne(req: Request, res: Response) {
		// TODO: Add logic to get a single image
	}

	static delete(req: Request, res: Response) {
		// TODO: Add logic to delete image
	}

	static upload(req: IRequest, res: Response) {
		const files = req.files.map((file: any) => file.filename);

		res.json({
			status: 'success',
			data: {
				album: 'default',
				files,
			},
		});
	}

	static setup(app: Application) {
		app.get('/images', Images.list);
		app.get('/images/:id', Images.getOne); // For getting a single image
		app.delete('/images/:id', Images.delete); // For deleting a single image
		app.post('/images/upload', upload.array('images'), Images.upload); // renamed to uploadImages
	}
}
