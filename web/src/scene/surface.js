import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Surface mode
 *
 * A walkable stretch of terrain for one body. The orrery owns a body's
 * orbit and color; this file owns the ground, the sun, and the two
 * sensors. Everything is generated, so no image files are added.
 * ------------------------------------------------------------------ */

/* Mean surface conditions and the swing the day cycle produces. */
const SENSORS = {
  mercury: { temp: 167, range: 260, humidity: 0.1, note: 'Airless rock' },
  venus: { temp: 464, range: 3, humidity: 0.4, note: 'Sulfuric haze' },
  earth: { temp: 15, range: 9, humidity: 62, note: 'Sea-level air' },
  moon: { temp: -20, range: 140, humidity: 0.1, note: 'Airless regolith' },
  mars: { temp: -63, range: 26, humidity: 0.6, note: 'Thin CO2 air' },
  jupiter: { temp: -108, range: 4, humidity: 4, note: 'Cloud deck' },
  saturn: { temp: -139, range: 4, humidity: 2, note: 'Cloud deck' },
  uranus: { temp: -195, range: 2, humidity: 1, note: 'Methane haze' },
  neptune: { temp: -201, range: 2, humidity: 2, note: 'Methane haze' },
};

export const SURFACE_SENSORS = SENSORS;

const GAS = new Set(['venus', 'jupiter', 'saturn', 'uranus', 'neptune']);

const TERRAIN_SIZE = 260;
const SEGMENTS = 110;
const EYE = 1.75;
const WALK = 7;
const RUN = 15;
const DAY_SECONDS = 150;

/* ------------------------------------------------------------------ *
 * Noise
 * ------------------------------------------------------------------ */

function hash2(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

function fbm(x, y, seed, octaves) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise(x * freq, y * freq, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ *
 * World
 * ------------------------------------------------------------------ */

function weightFor(id) {
  if (GAS.has(id)) return { amp: 3.5, scale: 0.012, detail: 0.55 };
  if (id === 'mars') return { amp: 22, scale: 0.018, detail: 1 };
  if (id === 'moon') return { amp: 12, scale: 0.026, detail: 1.1 };
  if (id === 'mercury') return { amp: 14, scale: 0.024, detail: 1.1 };
  return { amp: 12, scale: 0.016, detail: 1 };
}

function heightAt(id, x, z) {
  const w = weightFor(id);
  const seed = id.length * 13.7;
  const broad = fbm(x * w.scale, z * w.scale, seed, 4);
  const ridge = 1 - Math.abs(fbm(x * w.scale * 2.4, z * w.scale * 2.4, seed + 5, 3) * 2 - 1);
  const grit = fbm(x * 0.16, z * 0.16, seed + 11, 2) - 0.5;
  return (broad - 0.5) * w.amp * 2 + ridge * w.amp * 0.45 * w.detail + grit * (GAS.has(id) ? 0.5 : 2.4);
}

function makeSky(top, horizon, sunColor) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      horizonColor: { value: new THREE.Color(horizon) },
      sunColor: { value: new THREE.Color(sunColor) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      daylight: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      uniform float daylight;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 sky = mix(horizonColor, topColor, pow(h, 1.7));
        float sun = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 220.0);
        float halo = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 8.0) * 0.28;
        sky += sunColor * (sun * 1.4 + halo) * daylight;
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
}

function buildTerrain(bodyId, baseColor) {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const base = new THREE.Color(baseColor);
  const dark = base.clone().multiplyScalar(0.55);
  const accent = bodyId === 'earth' ? new THREE.Color('#b9a878') : new THREE.Color('#f4efe6');
  const light = base.clone().lerp(accent, bodyId === 'earth' ? 0.34 : 0.24);
  const tint = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = heightAt(bodyId, x, z);
    position.setY(i, y);
    const mix = THREE.MathUtils.clamp(y / 18 + 0.5, 0, 1);
    const grit = 0.82 + hash2(x * 3.1, z * 3.1, 9) * 0.36;
    tint.copy(dark).lerp(light, mix * mix).multiplyScalar(grit);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: GAS.has(bodyId) ? 0.95 : 0.92,
    metalness: 0.02,
    flatShading: GAS.has(bodyId),
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = false;
  return mesh;
}

function buildRocks(bodyId, baseColor) {
  const geometry = new THREE.DodecahedronGeometry(0.8, 0);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor).multiplyScalar(0.45),
    roughness: 1,
    flatShading: true,
  });
  const count = 150;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    const x = (hash2(i, 1, 3) - 0.5) * (TERRAIN_SIZE - 24);
    const z = (hash2(i, 2, 7) - 0.5) * (TERRAIN_SIZE - 24);
    const scale = 0.6 + hash2(i, 3, 11) * 2.2;
    dummy.position.set(x, heightAt(bodyId, x, z) + 0.35 * scale, z);
    dummy.rotation.set(hash2(i, 4, 13) * 0.6, hash2(i, 5, 17) * Math.PI * 2, hash2(i, 6, 19) * 0.6);
    dummy.scale.set(scale, scale * (0.55 + hash2(i, 7, 23) * 0.5), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Mount
 * ------------------------------------------------------------------ */

export function mountSurface(canvas, body) {
  const sensor = SENSORS[body.id];
  if (!canvas || !sensor) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

  const color = new THREE.Color(body.color || '#8a8a8a');
  const skyTop = color.clone().multiplyScalar(0.45).lerp(new THREE.Color('#0a1226'), 0.5).getStyle();
  const skyHorizon = color.clone().lerp(new THREE.Color('#f6e9d2'), 0.32).getStyle();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), makeSky(skyTop, skyHorizon, '#fff1cf'));
  sky.frustumCulled = false;
  scene.add(sky);

  scene.fog = new THREE.Fog(new THREE.Color(skyHorizon), 70, 240);

  /* Earth's orbit color is ocean blue; the walkable part is land. */
  const groundColor = body.id === 'earth' ? '#4f7a44' : body.color || '#8a8a8a';
  const ground = buildTerrain(body.id, groundColor);
  scene.add(ground);
  scene.add(buildRocks(body.id, groundColor));

  const sun = new THREE.DirectionalLight('#fff2d6', 2.1);
  scene.add(sun);
  const ambient = new THREE.HemisphereLight('#9fb6d8', color.clone().multiplyScalar(0.35), 0.9);
  scene.add(ambient);

  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#fff3d0', fog: false }),
  );
  scene.add(disc);

  const state = {
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0.03,
    /* Start at local noon so the first view is lit. */
    time: DAY_SECONDS * 0.25,
    elevation: 1,
    temp: sensor.temp,
    humidity: sensor.humidity,
    moving: false,
  };

  const keys = new Set();
  const listeners = new Set();
  let raf = 0;
  let last = 0;
  let disposed = false;
  let publishAt = 0;

  const snapshot = () => ({
    id: body.id,
    name: body.name,
    note: sensor.note,
    temp: state.temp,
    humidity: state.humidity,
    elevation: state.elevation,
    moving: state.moving,
    x: state.x,
    z: state.z,
    altitude: heightAt(body.id, state.x, state.z),
  });

  const publish = () => {
    const value = snapshot();
    listeners.forEach((listener) => listener(value));
  };

  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const onKeyDown = (event) => {
    const code = event.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
      keys.add(code);
      event.preventDefault();
    }
  };
  const onKeyUp = (event) => {
    keys.delete(event.code);
  };

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    state.yaw -= dx * 0.0032;
    state.pitch = THREE.MathUtils.clamp(state.pitch - dy * 0.0026, -1.15, 1.15);
  };
  const onPointerUp = (event) => {
    dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  const frame = (now) => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    state.time += dt;

    const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    state.moving = forward !== 0 || strafe !== 0;

    if (state.moving) {
      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK;
      const sin = Math.sin(state.yaw);
      const cos = Math.cos(state.yaw);
      const dx = (strafe * cos - forward * sin) * speed * dt;
      const dz = (-strafe * sin - forward * cos) * speed * dt;
      const limit = TERRAIN_SIZE / 2 - 12;
      state.x = THREE.MathUtils.clamp(state.x + dx, -limit, limit);
      state.z = THREE.MathUtils.clamp(state.z + dz, -limit, limit);
    }

    const groundY = heightAt(body.id, state.x, state.z);
    camera.position.set(state.x, groundY + EYE, state.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(state.yaw);
    camera.rotateX(state.pitch);

    /* Sun arcs over the terrain; its height drives light and the sensors. */
    const angle = (state.time / DAY_SECONDS) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle) * 0.92, 0.36).normalize();
    sun.position.copy(camera.position).addScaledVector(dir, 80);
    sun.target.position.copy(camera.position);
    sun.target.updateMatrixWorld();
    disc.position.copy(camera.position).addScaledVector(dir, 420);
    state.elevation = THREE.MathUtils.clamp(dir.y, -1, 1);
    const day = THREE.MathUtils.smoothstep(state.elevation, -0.12, 0.28);
    sun.intensity = 0.15 + day * 1.55;
    ambient.intensity = 0.22 + day * 0.52;
    sky.material.uniforms.sunDir.value.copy(dir);
    sky.material.uniforms.daylight.value = 0.25 + day * 0.9;

    const gain = Math.max(0, state.elevation) ** 0.7;
    const target = sensor.temp + sensor.range * (gain - 0.25);
    state.temp += (target - state.temp) * Math.min(1, dt * 0.8);
    const humidTarget = sensor.humidity * (0.7 + 0.3 * Math.sin(state.time * 0.21 + 1.4));
    state.humidity += (humidTarget - state.humidity) * Math.min(1, dt * 0.6);

    renderer.render(scene, camera);
    publishAt += dt;
    if (publishAt > 0.16) {
      publishAt = 0;
      publish();
    }
  };

  publish();
  raf = requestAnimationFrame(frame);

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
