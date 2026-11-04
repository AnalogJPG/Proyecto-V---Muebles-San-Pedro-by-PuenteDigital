# Muebles San Pedro — Sitio web

Sitio estático de catálogo con solicitud de cotización para Muebles San Pedro,
mueblería familiar en Tlajomulco de Zúñiga, Jalisco.

## Información del proyecto

| | |
| --- | --- |
| **Cliente** | Muebles San Pedro — Calle Juárez Eje Sur 23, Tlajomulco de Zúñiga, Jalisco |
| **Equipo** | Puente Digital |
| **Curso** | Proyecto V — Desarrollo de Sistemas Web, UDG Virtual |
| **Ciclo** | 2026 |

## Descripción

El sitio presenta el catálogo de muebles de la tienda y permite al visitante
armar un carrito y enviar una solicitud de cotización. No hay backend propio:
el catálogo se lee de **Cloud Firestore** y el carrito se guarda en el
`localStorage` del navegador.

## Estructura

```
.
├── index.html                    Portada con slider, categorías y videos
├── catalogo.html                 Catálogo con filtros, búsqueda y carrito
├── producto-detalle.html         Detalle de producto
├── quienes-somos.html            Historia, misión, visión y políticas
├── contacto.html                 Formulario de contacto, chat y mapa
├── cotizacion.html               Formulario de solicitud de cotización
├── preguntas-frecuentes.html     FAQ en acordeón de CSS puro
├── admin.html                    Panel de administración (sin enlace desde el sitio)
├── products.json                 Carga inicial de Firestore (12 productos); no se publica
├── css/
│   ├── styles.css                Estilos compartidos por las siete páginas
│   ├── carrito.css               Carrito: icono, badge, overlay y panel lateral
│   ├── catalogo.css              Estilos propios del catálogo
│   ├── index.css                 Estilos propios de la portada
│   ├── quienes-somos.css         Estilos propios de Quiénes Somos
│   ├── contacto.css              Estilos propios de Contacto
│   ├── preguntas-frecuentes.css  Estilos propios de FAQ
│   ├── cotizacion.css            Estilos propios de Cotización
│   └── admin.css                 Estilos propios del panel de administración
├── js/
│   ├── datos/
│   │   ├── firebase.js               Inicializa Firebase y exporta la app y Firestore
│   │   ├── autenticacion.js          Inicio de sesión del panel (único que carga Auth)
│   │   ├── repositorioProductos.js   Único punto de acceso a los datos
│   │   └── repositorioSolicitudes.js Único módulo que lee y escribe solicitudes
│   ├── admin.js                  Sesión, lista y detalle de solicitudes del panel
│   ├── ui/
│   │   └── formato.js                Formato de precios en es-MX
│   ├── carrito.js                Carrito con localStorage y delegación de eventos
│   ├── catalogo.js               Render del catálogo, filtros, búsqueda y modal
│   ├── cotizacion.js             Resumen del carrito y envío de la solicitud
│   ├── valoracion.js             Valoración por estrellas (las siete páginas)
│   └── slider.js                 Slider de la portada
├── scripts/
│   └── cargar-productos.mjs      Carga products.json en Firestore (no se publica)
├── images/                       Imágenes del sitio
└── videos/                       Videos de la promoción de temporada
```

## Cómo correr el proyecto en local

> [!IMPORTANT]
> **Ya no se puede abrir el HTML con doble clic.** El JavaScript está
> organizado en módulos ES, y los navegadores bloquean los módulos cuando la
> página se carga con el protocolo `file://`. Si abres el archivo directamente
> verás la página sin catálogo, sin carrito y con errores de CORS en la
> consola. Hay que **servir la carpeta** con un servidor local.

La opción más simple es la extensión **Live Server** de VS Code: clic derecho
sobre `index.html` → *Open with Live Server*.

Alternativas equivalentes, desde la raíz del proyecto:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

Después abre `http://localhost:8000` en el navegador.

## Tecnologías

HTML, CSS y JavaScript nativo con módulos ES. Sin frameworks, sin bundler ni
npm en el cliente y sin paso de compilación. El SDK de Firebase se carga desde
un CDN.

## Fuente de datos

El catálogo se lee de la colección `productos` de **Cloud Firestore**. Cada
documento es un producto y su ID es el `id` del producto. Todo acceso a esos
datos pasa por `js/datos/repositorioProductos.js` y solo por ahí; ningún otro
archivo consulta Firestore directamente.

`products.json` ya no es la fuente del sitio: solo es el archivo de carga
inicial que usa `scripts/cargar-productos.mjs` para llenar la colección. No se
publica en Firebase Hosting.

> [!WARNING]
> Ejecutar `scripts/cargar-productos.mjs` **sobrescribe** los documentos que
> tengan el mismo ID que un producto de `products.json`. Cualquier cambio hecho
> a esos documentos desde la consola de Firebase se pierde. Los documentos con
> otros IDs no se tocan.

## Panel de administración

`admin.html` permite al personal iniciar sesión y revisar las solicitudes de
cotización. No hay ningún enlace al panel desde el sitio público y la página
lleva `noindex`, pero eso solo la saca de la vista y de los buscadores.

> [!IMPORTANT]
> **La ruta del panel no lo protege.** Cualquiera puede abrir `admin.html`.
> Lo que protege las solicitudes es **Firebase Authentication**, que exige
> iniciar sesión, junto con las **reglas de seguridad de Firestore**, que
> deciden qué cuentas pueden leerlas y cambiar su estado. Si las reglas
> permitieran leer `solicitudes` sin esa restricción, el panel no lo impediría.

## Pendiente

Los datos de contacto del sitio son marcadores de posición (teléfono, correo,
enlaces de WhatsApp y de redes sociales). Están pendientes de sustituirse por
los datos reales del cliente.
