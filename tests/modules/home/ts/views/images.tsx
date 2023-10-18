import React from 'react';

export function Images({ items }) {
	if (!items.size) return null;

	const output = [...items.values()].map(item => {
		return (
			<li>
				<div className='image__container'>
					<img src={item.src} alt='cualquier cosa' />
				</div>
			</li>
		);
	});
	return <ul>{output}</ul>;
}
