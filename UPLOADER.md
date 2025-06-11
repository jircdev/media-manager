# `@aimpact/media-manager/uploader`

A **zero-UI, framework-agnostic** module that handles client-side file selection, drag-and-drop, validation, optional
image-resize and multipart uploads—with real progress events and cancelation.

The package exports:

| Export               | Purpose                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `Uploader`           | Headless class that orchestrates file picking, drag-and-drop, validation and network upload. |
| `useUploader` (hook) | Thin React wrapper that wires `Uploader` to your JSX, returning the refs and state you need. |

```ts
import { Uploader, useUploader } from '@aimpact/media-manager/uploader';
```

## 1 · Vanilla JavaScript / Framework-agnostic usage html Copy <button id="pick">Select files</button>

```html
<div id="drop-zone"></div>
<button id="upload">Upload</button>
```

```ts
<script type="module">
	import { Uploader } from '@aimpact/media-manager/uploader';

	/** 1. Create the uploader (only once) */
	const uploader = new Uploader({
		url: '/api/upload',
		name: 'userFiles',
		multiple: true,
	});

	/** 2. Wire your DOM elements */
	const pickBtn  = document.getElementById('pick');
	const dropZone = document.getElementById('drop-zone');
	uploader.create(pickBtn, dropZone);

	/** 3. Listen to changes */
	uploader.on('change', () => {
		console.log(`Files selected: ${uploader.files.total}`);
	});

	uploader.on('error', (err) => console.error('Validation error', err));

	/** 4. Trigger the upload */
	document.getElementById('upload').onclick = async () => {
		try {
			const json = await uploader.publish({ userId: 42 });
			console.log('Server response:', json);
		} catch (e) {
			console.error('Upload failed', e);
		}
	};
</script>
```

## 2 · React usage with useUploader tsx

```tsx
import React from 'react';
import { useUploader } from '@aimpact/media-manager/uploader';

export default function FileUploader() {
	const { triggerRef, dropZoneRef, publish, uploading, progress, errors } = useUploader({
		url: '/api/upload',
		name: 'userFiles',
		multiple: true
	});

	return (
		<div>
			<button ref={triggerRef}>Select files</button>

			<div ref={dropZoneRef} style={{ marginTop: 12, padding: 24, border: '2px dashed #999' }}>
				Drag &amp; drop files here
			</div>

			<button onClick={() => publish()} disabled={uploading}>
				{uploading ? `Uploading… ${progress}%` : 'Upload'}
			</button>

			{errors.length > 0 && (
				<ul style={{ color: 'red' }}>
					{errors.map(e => (
						<li key={e}>{e}</li>
					))}
				</ul>
			)}
		</div>
	);
}
```

### API Essentials

| `IUploaderSpecs` field               | Description                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `url` (string, **req.**)             | Destination endpoint.                                                                  |
| `name` (string, **req.**)            | Form-field name for the uploaded files.                                                |
| `multiple` (boolean)                 | Allows multi-file selection. Default `false`.                                          |
| `params` (object)                    | Extra key/value pairs merged into the `metadata` JSON field.                           |
| `chunked`, `chunkSize`, `retries`    | Opt-in support for chunked uploads (coming soon).                                      |
| `input` (Partial\<HTMLInputElement>) | Additional attributes for the hidden `<input type="file">` (e.g., `accept="image/*"`). |

### Common events

```ts
uploader.on('file:loaded', ({ file, src }) => { ... });
uploader.on('all:loaded', ({ files }) => { ... });
uploader.on('validation:error', ({ file, reason }) => { ... });
uploader.on('change', () => { ... });
uploader.on('loadend', () => { ... });
```

### Why another uploader? Headless & composable – bring your own UI or framework.

Platform aware – adapters for Web and (coming) mobile runtimes.

Modern image pipeline – optional EXIF-aware resize via OffscreenCanvas.

Robust network layer – progress, bearer auth, cancelation.
