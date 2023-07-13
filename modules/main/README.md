# Gestor Media

La libreria exporta un objeto factory 'mediaDevice' que disponibiliza un objeto MediaDevice con interfaz de tipo
ICamera.

El objeto MEdiaDevice retornado sera diferente segun la plataforma en la que se esté ejecutando, de modo que los metodos
estarán ajustados según la plataforma.

# Métodos.

-   getPicure: Activa la cámara para tomar la foto. en movil hace uso del plugin cordova-camera y en web hace uso de
    WebRTC.

    -   parametros: specs. Objeto de configuracion para el plugin de teléfono.

    -   return: el metodo getPicture retorna el src de la imagen lista para ser integrada en el Documento del sitio o
        enviada al backend.
