import React from 'react';
import { useComponentAudioContext } from './context';

const normalizeData = filteredData => {
	const multiplier = Math.pow(Math.max(...filteredData), -1);
	return filteredData.map(n => n * multiplier);
};

const drawLineSegment1 = (ctx, x, y, width, isEven) => {
	ctx.lineWidth = 1; // how thick the line is
	ctx.strokeStyle = '#fff'; // what color our line is
	ctx.beginPath();
	y = isEven ? y : -y;
	ctx.moveTo(x, 0);
	ctx.lineTo(x, y);
	ctx.arc(x + width / 2, y, width / 2, Math.PI, 0, isEven);
	ctx.lineTo(x + width, 0);
	ctx.stroke();
};
const drawLineSegment = (ctx: CanvasRenderingContext2D, x: number, y: number, barWidth: number): void => {
	ctx.lineWidth = 1;
	ctx.strokeStyle = '#fff';

	// Draw line upwards
	ctx.beginPath();
	ctx.moveTo(x + barWidth / 2, 0);
	ctx.lineTo(x + barWidth / 2, -y);
	ctx.stroke();

	// Draw line downwards
	ctx.beginPath();
	ctx.moveTo(x + barWidth / 2, 0);
	ctx.lineTo(x + barWidth / 2, y);
	ctx.stroke();
};

const draw = (canvas: HTMLCanvasElement, normalizedData: number[]): void => {
	const dpr = window.devicePixelRatio || 1.5;
	const padding = 20;
	canvas.width = canvas.offsetWidth * dpr;
	canvas.height = (canvas.offsetHeight + padding * 2) * dpr;
	const ctx = canvas.getContext('2d');
	ctx.scale(dpr, dpr);
	ctx.translate(0, canvas.offsetHeight / 2 + padding);

	// Draw X-axis
	ctx.strokeStyle = '#cc0000'; // Set the color of the X-axis
	ctx.lineWidth = 1; // Set the line width of the X-axis
	ctx.beginPath();
	ctx.moveTo(0, 0); // Start point of the X-axis
	ctx.lineTo(canvas.offsetWidth, 0); // End point of the X-axis
	ctx.stroke();

	const totalWidth = canvas.offsetWidth;
	const barWidth = 3; // Width of individual bars, can be more than 1
	const separation = 1; // Spacing between bars
	const segmentWidth = barWidth + separation; // Combined width of a bar and the space after it
	const numBars = Math.floor(totalWidth / segmentWidth); // Total number of bars that will fit on the canvas

	for (let i = 0; i < numBars; i++) {
		const dataIndex = Math.floor((i / numBars) * normalizedData.length);
		const x = segmentWidth * i;
		let height = normalizedData[dataIndex] * canvas.offsetHeight - padding;

		if (height < 0) height = 0;
		else if (height > canvas.offsetHeight / 2) height = canvas.offsetHeight / 2;

		drawLineSegment(ctx, x, height, segmentWidth);
	}
};

const draw1 = (canvas, normalizedData) => {
	// Set up the canvas

	const dpr = window.devicePixelRatio || 1.5;
	const padding = 20;
	canvas.width = canvas.offsetWidth * dpr;
	canvas.height = (canvas.offsetHeight + padding * 2) * dpr;
	const ctx = canvas.getContext('2d');
	ctx.scale(dpr, dpr);
	ctx.translate(0, canvas.offsetHeight / 2 + padding); // Set Y = 0 to be in the middle of the canvas

	// draw the line segments
	const width = canvas.offsetWidth / normalizedData.length;
	for (let i = 0; i < normalizedData.length; i++) {
		const x = width * i;
		let height = normalizedData[i] * canvas.offsetHeight - padding;
		if (height < 0) {
			height = 0;
		} else if (height > canvas.offsetHeight / 2) {
			height = canvas.offsetHeight / 2;
		}
		drawLineSegment(ctx, x, height, width, (i + 1) % 2);
	}
};
const filterData = audioBuffer => {
	const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
	const samples = 70; // Number of samples we want to have in our final data set
	const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
	const filteredData = [];
	for (let i = 0; i < samples; i++) {
		let blockStart = blockSize * i; // the location of the first sample in the block
		let sum = 0;
		for (let j = 0; j < blockSize; j++) {
			sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
		}
		filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
	}
	return filteredData;
};

const visualize = (audioBuffer, selector) => {
	return draw(selector, normalizeData(filterData(audioBuffer)));
};

export function Visualizer() {
	const { buffer } = useComponentAudioContext();
	console.log(10, buffer);
	const ref = React.useRef(null);
	React.useEffect(() => {
		visualize(buffer, ref.current);
	}, []);
	return (
		<>
			<canvas ref={ref} />
		</>
	);
}
