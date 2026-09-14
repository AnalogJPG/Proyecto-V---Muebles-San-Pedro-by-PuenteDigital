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
armar un carrito y enviar una solicitud de cotización. No hay backend: el
catálogo se dibuja a partir de un archivo de datos local y el carrito se
guarda en el `localStorage` del navegador.

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
├── products.json                 Fuente de datos del catálogo (12 productos)
├── css/
│   ├── styles.css                Estilos compartidos por las siete páginas
│   ├── carrito.css               Carrito: icono, badge, overlay y panel lateral
│   ├── catalogo.css              Estilos propios del catálogo
│   ├── index.css                 Estilos propios de la portada
│   ├── quienes-somos.css         Estilos propios de Quiénes Somos
│   ├── contacto.css              Estilos propios de Contacto
│   ├── preguntas-frecuentes.css  Estilos propios de FAQ
│   └── cotizacion.css            Estilos propios de Cotización
├── js/
│   ├── datos/
│   │   └── repositorioProductos.js   Único punto de acceso a los datos
│   ├── ui/
│   │   └── formato.js                Formato de precios en es-MX
│   ├── carrito.js                Carrito con localStorage y delegación de eventos
│   ├── catalogo.js               Render del catálogo, filtros, búsqueda y modal
│   ├── valoracion.js             Valoración por estrellas (las siete páginas)
│   └── slider.js                 Slider de la portada
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

HTML, CSS y JavaScript nativo con módulos ES. Sin frameworks, sin
dependencias y sin paso de compilación.

## Fuente de datos

Los doce productos del catálogo viven en `products.json`. Todo acceso a esos
datos pasa por `js/datos/repositorioProductos.js` y solo por ahí; ningún otro
archivo lee el JSON directamente.

Ese módulo expone funciones asíncronas aunque hoy la fuente sea local. Es
deliberado: está prevista la migración a **Cloud Firestore** en un Sprint
posterior, y cuando ocurra solo debe cambiar ese archivo.

## Pendiente

Los datos de contacto del sitio son marcadores de posición (teléfono, correo,
enlaces de WhatsApp y de redes sociales). Están pendientes de sustituirse por
los datos reales del cliente.
