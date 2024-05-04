export const resizePicture = (uri, specs) =>
	new Promise(resolve => {
		specs = specs ? specs : {};

		const maxWidth = specs.maxWidth ? specs.maxWidth : 800;
		const maxHeight = specs.maxHeight ? specs.maxHeight : maxWidth / (4 / 3);
		const quality = specs.quality ? specs.quality : 0.8;

		const img = new Image();

		img.src = uri;

		img.onload = function () {
			let width = img.width;
			let height = img.height;
			let orientation;

			if (width < height) {
				orientation = "portrait";
				if (height > maxHeight) {
					width *= maxHeight / height;
					height = maxHeight;
				}
			} else {
				orientation = "landscape";
				if (width > maxWidth) {
					height *= maxWidth / width;
					width = maxWidth;
				}
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, width, height);
			let image = canvas.toDataURL("image/jpeg", quality);

			if (!specs.rotate) {
				resolve({
					src: image,
					width: width,
					height: height,
					orientation: orientation,
				});
			}

			const rotateCanvas = document.createElement("canvas");
			let ctxRotate = rotateCanvas.getContext("2d");

			rotateCanvas.height = width;
			rotateCanvas.width = height;
			const imgRotate = new Image();

			imgRotate.onload = () => {
				ctxRotate.translate(rotateCanvas.width / 2, rotateCanvas.height / 2);
				ctxRotate.rotate(Math.PI / 2);
				ctxRotate.drawImage(imgRotate, -imgRotate.width / 2, -imgRotate.height / 2);
				ctxRotate.rotate(-Math.PI / 2);
				ctxRotate.translate(-imgRotate.width / 2, -imgRotate.height / 2);
				const imageRotated = rotateCanvas.toDataURL("image/jpg", 1);
				resolve({
					src: imageRotated,
					width: width,
					height: height,
					orientation: orientation,
					aja: true,
				});
			};

			imgRotate.src = image;
		};
	});
