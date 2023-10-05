import React from 'react';

export /*bundle*/
function View(): JSX.Element {
	const ref = React.useRef<HTMLCanvasElement>(null);
	return (
		<div className='page__container'>
			<h1>
				<canvas ref={ref} />
			</h1>
		</div>
	);
}
