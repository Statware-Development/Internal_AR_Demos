# Catálogo AR

Demo WebAR (MindAR + Three.js) para un catálogo impreso. Al abrir la página se activa la cámara; al escanear la portada aparece el modelo 3D de la empresa y, al pasar a las siguientes páginas, el modelo de cada producto.

Estado actual: portada + 3 páginas de producto, con **modelos placeholder** (toro, cubo, esfera, cono) hasta que se agreguen los `.glb` y el `.mind` reales.

## Estructura

```
Catalogo AR/
├── index.html          # Página, import map (Three.js y MindAR por CDN) y UI
├── css/style.css       # Estilos de la interfaz (cambia --accent por el color de marca)
├── js/
│   ├── config.js       # ⭐ Textos, marcadores, modelos, escala y posición
│   ├── main.js         # Cámara, tracking, carga de modelos y bucle de animación
│   └── placeholders.js # Figuras temporales
├── models/             # Aquí van los .glb
└── targets/            # Aquí va targets.mind
```

## Reemplazar los placeholders

### 1. Archivo `.mind`
1. Abre el compilador: <https://hiukim.github.io/mind-ar-js-doc/tools/compile>
2. Sube las imágenes **en este orden**: portada, página 1, página 2, página 3. El orden define el `index` (0, 1, 2, 3).
3. Descarga el resultado, renómbralo a `targets.mind` y colócalo en `targets/`.

Usa imágenes con buen detalle y contraste (evita fondos lisos o muy repetitivos): impactan directamente la estabilidad del tracking.

### 2. Modelos `.glb`
Copia los archivos en `models/` con estos nombres (o cambia las rutas en `js/config.js`):

| Marcador | Archivo |
|---|---|
| 0 – Portada | `models/portada.glb` |
| 1 – Página 1 | `models/producto-1.glb` |
| 2 – Página 2 | `models/producto-2.glb` |
| 3 – Página 3 | `models/producto-3.glb` |

Si un `.glb` no existe o falla al cargar, se muestra el placeholder y se avisa en la consola del navegador. Así puedes ir sustituyendo los modelos uno por uno.

Recomendaciones: formato glTF binario (`.glb`), idealmente < 5 MB por modelo, texturas ≤ 2048 px. Las animaciones incluidas en el `.glb` se reproducen automáticamente.

### 3. Ajustar escala, posición y textos
Todo está en `js/config.js`. El ancho del marcador mide **1 unidad**, así que `scale: 0.4` equivale a un modelo de ~40 % del ancho de la hoja (si el modelo mide 1 unidad). `position: [x, y, z]` mueve el modelo; `z` es la altura sobre la hoja.

## Animaciones y movimientos más complejos

El bucle de render está en `js/main.js` (`renderer.setAnimationLoop`) y ya expone `delta` y `elapsed`. Hay tres puntos de extensión:

- **Animaciones del `.glb`:** se reproducen solas mediante `AnimationMixer`.
- **`onUpdate` por página:** en `config.js` puedes asignar `onUpdate: (entry, delta, elapsed) => { ... }`; `entry.object` es el modelo y `entry.group` el contenedor que se escala/posiciona.
- **Eventos:** `anchor.onTargetFound` / `onTargetLost` en `main.js` son el lugar para disparar animaciones, sonidos o transiciones.

Ejemplo:

```js
onUpdate: (entry, delta, elapsed) => {
  entry.object.rotation.y += delta;                              // giro continuo
  entry.group.position.z = 0.25 + Math.sin(elapsed * 2) * 0.05;  // sube y baja
},
```

## Probar en local

La cámara solo funciona en `https://` o en `localhost`. Desde la carpeta `Catalogo AR`:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080` en tu PC, o usa un túnel HTTPS (p. ej. ngrok) para probar desde el celular.

## Publicar en GitHub Pages

1. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `main`, carpeta `/ (root)`.
2. La página quedará en:
   `https://<usuario-u-organización>.github.io/Internal_AR_Demos/WebAR/Catalogo%20AR/`
3. Todas las rutas del proyecto son relativas, por lo que funciona dentro de esa subcarpeta. Si prefieres una URL sin `%20`, renombra la carpeta (por ejemplo `Catalogo_AR`).

Nota: GitHub Pages en repositorios privados requiere un plan que lo permita (GitHub Pro/Team/Enterprise).

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| "No pudimos iniciar la cámara" | Permiso de cámara denegado, página sin HTTPS, o falta `targets/targets.mind` |
| Se ve el placeholder en lugar del modelo | El `.glb` no existe, el nombre no coincide o falló la carga (revisa la consola) |
| El modelo aparece enorme/diminuto | Ajusta `scale` en `config.js` |
| El modelo "tiembla" | Mejora la imagen del marcador, ajusta `tracking` o baja `poseSmoothing.position` / `poseSmoothing.rotation` en `js/config.js` (más bajo = más suave, con más retraso) |
