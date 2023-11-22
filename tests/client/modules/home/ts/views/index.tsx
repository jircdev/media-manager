import React from 'react';
import { useBinder } from '@beyond-js/react-18-widgets/hooks';
import { Images } from './images';
import { Button } from 'pragmate-ui/components';
import { Alert } from 'pragmate-ui/alert';

type Error = { status?: boolean; message?: string };
export /*bundle*/
function View({ store }): JSX.Element {
	const ref = React.useRef<HTMLCanvasElement>(null);
	const draggable = React.useRef<HTMLCanvasElement>(null);
	const [fetching, setFetching] = React.useState(false);
	const [error, setError] = React.useState<Error>({ status: true, message: 'no hay archivos' });

	const [items, setItems] = React.useState([]);
	React.useEffect(() => {
		store.create(ref.current, draggable.current);
	}, []);

	useBinder([store.uploader], () => {
		setFetching(store.fetching || store.uploader.fetching);
		setItems(store.uploader.files?.items);
	});

	const onSend = async event => {
		event.preventDefault();
		try {
			setFetching(true);
			await store.upload();
		} catch (e) {
			setError({ status: true, message: e.message });
		} finally {
			setFetching(false);
		}
	};

	const attrs = { disabled: !store.uploader.files?.items?.size };
	return (
		<div className='page__container'>
			<header>
				<h1>Carga de imagenes!</h1>
			</header>

			{error.status && <Alert type='error'>{error.message}</Alert>}
			<div>
				<section className='box__container' ref={draggable}>
					<Button variant='primary' ref={ref}>
						Cargar Elementos
					</Button>
				</section>
			</div>

			<section>
				<Images items={items} fetching={fetching} />
			</section>

			<footer>
				<Button {...attrs} onClick={onSend}>
					Enviar archivos
				</Button>
			</footer>
		</div>
	);
}
