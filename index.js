let i = 0;
let instance = setInterval(() => {
	while (i < 10) {
		console.log(i);
		i++;
	}
	clearInterval(instance);
}, 1000);
