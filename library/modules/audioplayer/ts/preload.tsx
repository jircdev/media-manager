import React from 'react';
import {IconButton} from 'pragmate-ui/icons';

export function Preload({}) {
	return (
		<div className="player__container player__container--preload">
			<IconButton disabled icon="play" />
			<div className="audio__container">
				<div className="audio__thumb">
					<div className="range__preload" />
				</div>
				<div className="timer__container">
					<span className="timer__numbers">00</span>
					<div className="timer__separator">:</div>
					<span className="timer__numbers">00</span>
				</div>
			</div>
		</div>
	);
}
