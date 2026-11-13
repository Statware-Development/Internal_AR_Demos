/**
 * Configuración del catálogo. Este es el ÚNICO archivo que normalmente hay que tocar.
 *
 * - `index` es la posición de la imagen dentro del archivo .mind
 *   (orden en que se subieron al compilador de MindAR, empezando en 0).
 * - `model`: ruta al .glb (relativa a index.html). Si es null o el archivo no existe,
 *   se muestra el placeholder definido en `placeholder`.
 * - Unidades: el ancho del marcador mide 1. Un modelo con scale 0.5 mide ~la mitad del ancho de la hoja.
 */
export const CONFIG = {
  company: 'Tu Empresa',

  mindFile: './targets/targets.mind',

  // Cuántas hojas se pueden rastrear a la vez (1 = una a la vez).
  maxTrack: 1,

  // Estabilidad del tracking (valores por defecto de MindAR, salvo missTolerance).
  tracking: {
    filterMinCF: 0.001,
    filterBeta: 1000,
    warmupTolerance: 5,
    missTolerance: 30,
  },

  texts: {
    loading: 'Preparando la cámara…',
    scanCover: 'Apunta la cámara a la portada del catálogo',
    scanNext: (name) => `Pasa a la siguiente página: ${name}`,
    scanAgain: 'Apunta la cámara a cualquier página del catálogo',
    cameraDenied: 'Permite el acceso a la cámara en tu navegador y vuelve a intentarlo.',
    cameraSelectionUnavailable: 'Este navegador no permite seleccionar cámaras para comprobar el enfoque continuo.',
    cameraCheckFailed: 'No se pudieron comprobar las cámaras disponibles. Verifica los permisos y vuelve a intentarlo.',
    continuousFocusUnavailable: 'No se encontró una cámara disponible con enfoque continuo.',
    continuousFocusActivationFailed: 'No se pudo activar el enfoque continuo en la cámara seleccionada.',
    generic: 'Revisa tu conexión y que el archivo targets/targets.mind exista. Luego reintenta.',
  },

  targets: [
    {
      index: 0,
      id: 'portada',
      label: 'Portada',
      title: 'Bienvenido',
      message: 'Este es el modelo de la empresa. Pasa a la siguiente página para ver los productos.',
      model: './models/portada.glb',
      placeholder: { type: 'torusKnot', color: 0x2ec4b6 },
      scale: 1,
      position: [0, 0, 0.25],   // x, y, z (z = altura sobre la hoja)
      rotation: [0, 0, 0],      // radianes
      // Hook opcional para animaciones personalizadas: (entry, delta, elapsed) => {}
      onUpdate: null,
    },
    {
      index: 1,
      id: 'pagina-1',
      label: '1',
      title: 'Producto 1',
      message: 'Sigue con la siguiente página.',
      model: './models/producto-1.glb',
      placeholder: { type: 'box', color: 0xff9f1c },
      scale: 1,
      position: [0, 0, 0.25],
      rotation: [0, 0, 0],
      onUpdate: null,
    },
    {
      index: 2,
      id: 'pagina-2',
      label: '2',
      title: 'Producto 2',
      message: 'Sigue con la siguiente página.',
      model: './models/producto-2.glb',
      placeholder: { type: 'sphere', color: 0xe71d36 },
      scale: 1,
      position: [0, 0, 0.25],
      rotation: [0, 0, 0],
      onUpdate: null,
    },
    {
      index: 3,
      id: 'pagina-3',
      label: '3',
      title: 'Producto 3',
      message: 'Has llegado a la última página escaneable por ahora.',
      model: './models/producto-3.glb',
      placeholder: { type: 'cone', color: 0x5e60ce },
      scale: 1,
      position: [0, 0, 0.25],
      rotation: [0, 0, 0],
      onUpdate: null,
    },
  ],
};
