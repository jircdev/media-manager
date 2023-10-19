import React from 'react';
import { Image } from 'pragmate-ui/image';
import { IconButton } from 'pragmate-ui/icons';
export function Images({ items, fetching }) {
	if (!items.size || fetching) return null;

	const output = [...items.values()].map(item => {
		return (
			<li key={item.name}>
				<div className='image__container'>
					<Image src={item.src} alt={item.name}>
						<figcaption>
							<IconButton icon='delete' />
						</figcaption>
					</Image>
				</div>
			</li>
		);
	});
	return <ul>{output}</ul>;
}
