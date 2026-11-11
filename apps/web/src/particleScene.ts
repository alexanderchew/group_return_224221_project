import {
  BufferGeometry, Color, Float32BufferAttribute, PerspectiveCamera, Points, Scene, ShaderMaterial, WebGLRenderer,
} from 'three';

const spectrum = [0xcb3f59, 0xcf6731, 0xa87909, 0x3c934f, 0x168e9f, 0x416bd3, 0x794bc3, 0xb9448e];
const particleCount = 96;
const rainbowSeconds = 2.2;
const vertexShader = /* glsl */ `
  uniform float time;
  uniform float rainbow;
  uniform float pixelRatio;
  uniform vec3 teal;
  attribute vec4 orbit;
  attribute vec3 axisA;
  attribute vec3 axisB;
  attribute vec3 hue;
  varying vec3 pointColor;
  varying float opacity;

  void main() {
    float angle = orbit.x + orbit.y * time;
    float radius = orbit.z * (1.0 + 0.08 * sin(time * 0.9 + orbit.x) + 0.12 * rainbow);
    vec3 point = radius * (axisA * cos(angle) + axisB * sin(angle));
    vec4 view = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = orbit.w * pixelRatio * (4.5 / -view.z);
    pointColor = mix(teal, hue, rainbow);
    opacity = clamp(0.66 + 0.28 * point.z, 0.38, 0.95);
  }
`;
const fragmentShader = /* glsl */ `
  varying vec3 pointColor;
  varying float opacity;

  void main() {
    float edge = 1.0 - smoothstep(0.28, 0.5, length(gl_PointCoord - vec2(0.5)));
    gl_FragColor = vec4(pointColor, edge * opacity);
    #include <colorspace_fragment>
  }
`;

function makeGeometry() {
  const orbit: number[] = [], axisA: number[] = [], axisB: number[] = [], hue: number[] = [];
  for (let i = 0; i < particleCount; i++) {
    const inclination = Math.random() * 2 - 1;
    const tilt = Math.random() * Math.PI * 2;
    const cos = Math.cos(tilt), sin = Math.sin(tilt);
    const speed = 0.45 + Math.random() * 0.7;
    orbit.push(Math.random() * Math.PI * 2, i % 4 === 0 ? -speed : speed, 0.33 + Math.sqrt(Math.random()) * 0.53, 2.7 + Math.random() * 2.5);
    axisA.push(cos, sin, 0);
    axisB.push(-inclination * sin, inclination * cos, Math.sqrt(1 - inclination ** 2));
    new Color(spectrum[i % spectrum.length]).toArray(hue, i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(particleCount * 3), 3));
  geometry.setAttribute('orbit', new Float32BufferAttribute(orbit, 4));
  geometry.setAttribute('axisA', new Float32BufferAttribute(axisA, 3));
  geometry.setAttribute('axisB', new Float32BufferAttribute(axisB, 3));
  geometry.setAttribute('hue', new Float32BufferAttribute(hue, 3));
  return geometry;
}

type OrbState = { ready: boolean; paused: boolean };

export function createParticleScene(host: HTMLDivElement, initial: OrbState, setDrawing: (drawing: boolean) => void) {
  const renderer = new WebGLRenderer({ alpha: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.z = 4.5;

  const uniforms = {
    time: { value: 0 }, rainbow: { value: 0 }, pixelRatio: { value: 1 }, teal: { value: new Color(0x19796b) },
  };
  const geometry = makeGeometry();
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false });
  const cloud = new Points(geometry, material);
  cloud.frustumCulled = false;
  scene.add(cloud);
  host.append(canvas);

  let paused = initial.paused;
  let inView = false;
  let contextLost = false;
  let elapsed = 0;
  let readyAt = initial.ready ? -rainbowSeconds : null;
  let previousFrame: number | null = null;
  let frameId: number | null = null;

  function draw() {
    if (contextLost) return;
    const sinceReady = readyAt === null ? 0 : elapsed - readyAt;
    const progress = Math.min(1, sinceReady / rainbowSeconds);
    uniforms.rainbow.value = progress ** 2 * (3 - 2 * progress);
    // Ease into a slower orbit without interrupting the current motion.
    uniforms.time.value = elapsed - 0.42 * (sinceReady + Math.expm1(-sinceReady));
    renderer.render(scene, camera);
  }

  function tick(timestamp: number) {
    if (previousFrame !== null) elapsed += Math.min(0.08, (timestamp - previousFrame) / 1000);
    previousFrame = timestamp;
    draw();
    frameId = requestAnimationFrame(tick);
  }

  function syncLoop() {
    const running = inView && !document.hidden && !paused && !contextLost;
    if (running && frameId === null) frameId = requestAnimationFrame(tick);
    if (!running && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
      previousFrame = null;
    }
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || contextLost) return;
    const density = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(density);
    renderer.setSize(width, height, false);
    uniforms.pixelRatio.value = density;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }

  function loseContext() {
    contextLost = true;
    setDrawing(false);
    syncLoop();
  }

  function restoreContext() {
    contextLost = false;
    resize();
    setDrawing(true);
    syncLoop();
  }

  const size = new ResizeObserver(resize);
  size.observe(host);
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncLoop();
  });
  visibility.observe(host);
  document.addEventListener('visibilitychange', syncLoop);
  canvas.addEventListener('webglcontextlost', loseContext);
  canvas.addEventListener('webglcontextrestored', restoreContext);
  resize();
  setDrawing(true);

  return {
    update(next: OrbState) {
      paused = next.paused;
      readyAt = next.ready ? readyAt ?? elapsed : null;
      syncLoop();
    },
    dispose() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      size.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', syncLoop);
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', restoreContext);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
