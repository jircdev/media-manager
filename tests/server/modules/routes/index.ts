import type { Application, Request, Response } from 'express';
import { indexEndpoint } from './endpoints';
import { Images } from './endpoints/images';

export /*bundle*/ function routes(app: Application) {
	Images.setup(app);
}
