import type { Application, Request, Response } from 'express';

export class Images {
	static list(req, res) {}

	static delete(req: Request, res: Response) {
		//todo: add logic to delete
	}

	static setup(app: Application) {
		app.get('/images', Images.list);
	}
}
