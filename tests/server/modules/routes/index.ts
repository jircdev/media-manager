import type { Application, Request, Response } from 'express';

import { Images } from './endpoints/images';

export /*bundle*/ function routes(app: Application) {
	const images = new Images();
	
	Images.setup(app);
}
