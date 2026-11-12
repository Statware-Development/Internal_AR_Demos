import * as THREE from 'three';

/** Figuras simples que se muestran mientras no existan los .glb reales. */
export function createPlaceholder({ type = 'box', color = 0xffffff } = {}) {
  let geometry;
  switch (type) {
    case 'torusKnot': geometry = new THREE.TorusKnotGeometry(0.5, 0.18, 128, 24); break;
    case 'sphere':    geometry = new THREE.SphereGeometry(0.6, 48, 32); break;
    case 'cone':      geometry = new THREE.ConeGeometry(0.55, 1.1, 40); break;
    case 'box':
    default:          geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9); break;
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 })
  );

  // Rotación y flotación suave (ejemplo de animación por frame).
  mesh.userData.update = (delta, elapsed) => {
    mesh.rotation.y += delta * 0.9;
    mesh.position.y = Math.sin(elapsed * 1.6) * 0.06;
  };
  return mesh;
}
