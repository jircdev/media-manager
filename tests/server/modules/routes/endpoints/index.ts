import type { Application, Request, Response } from 'express';
export const indexEndpoint = (req: Request, res: Response) => {
	res.send('Express page with BeyondJS');
};
