import React from 'react';
import { useBinder } from '@beyond-js/react-18-widgets/hooks';
import { Images } from './images';
export /*bundle*/
function View({ store }): JSX.Element {
	const ref = React.useRef<HTMLCanvasElement>(null);
	const draggable = React.useRef<HTMLCanvasElement>(null);

	const [items, setItems] = React.useState([]);
	React.useEffect(() => {
		store.create(ref.current, draggable.current);
	}, []);

	useBinder([store.uploader], () => {
		console.log(10, store.uploader.files?.items);
		setItems(store.uploader.files?.items);
	});

	return (
		<div className='page__container'>
			<h1>Hello World!</h1>
			<section className='box__container' ref={draggable}>
				<button ref={ref}>Cargar Elementos</button>
			</section>
			<hr />
			<button>Enviar archivos</button>
			<section>
				<Images items={items} />
			</section>
		</div>
	);
}
