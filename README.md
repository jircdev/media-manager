# Media Manager Tools

**_Set of tools to manage media content as an audio player and a media uploader._**

## Uploader

Reactive Model to manage draggable input creation, files reading and server uploading.

### PARAMETERS

- Specs : `{  url: "string", params: {  project: "string", container: "string", input: {InputAttributes}  }  }`

## Uploader Hook

React hook that facilitates media upload to an specific URL.

### PARAMETERS

- Specs : `{  url: "string", project: "string", container: "string"  }`

### RETURNS

- **uploadFiles**: Function to publish files to selected URL. It accepts additional parametres as argument.
- **clearFiles**: Function to delete files from input.
- **files**: Files on input.
- **fetching**: Boolean.
- **button**: Button reference to add to HTML Element.
- **drag**: Drag reference to add to HTML Element.
