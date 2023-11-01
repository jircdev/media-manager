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
	static list(req, res) {}

	static delete(req: Request, res: Response) {
		//todo: add logic to delete
	}

	static upload(req: IRequest, res: Response) {
		const files = req.files.map(file => file.filename);

		res.json({
			status: 'success',
			data: {
				files,
			},
		});
	}
	
	static setup(app: Application) {
		app.get('/images', Images.list);
		app.post('/upload', upload.array('images'), Images.upload);
	}
}
