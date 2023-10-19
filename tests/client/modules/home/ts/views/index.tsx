import React from 'react';
import { useBinder } from '@beyond-js/react-18-widgets/hooks';
import { Images } from './images';
import { Button } from 'pragmate-ui/components';
export /*bundle*/
function View({ store }): JSX.Element {
	const ref = React.useRef<HTMLCanvasElement>(null);
	const draggable = React.useRef<HTMLCanvasElement>(null);
	const [fetching, setFetching] = React.useState(false);

	const [items, setItems] = React.useState([]);
	React.useEffect(() => {
		store.create(ref.current, draggable.current);
	}, []);

	useBinder([store.uploader], () => {
		setFetching(store.uploader.fetching);
		setItems(store.uploader.files?.items);
	});

	return (
		<div className='page__container'>
			<h1>Hello World!</h1>
			<section className='box__container' ref={draggable}>
				<Button variant='primary' ref={ref}>
					Cargar Elementos
				</Button>
			</section>

			<section>
				<Images items={items} fetching={fetching} />
			</section>

			<footer>
				<Button>Enviar archivos</Button>
			</footer>
		</div>
	);
}
