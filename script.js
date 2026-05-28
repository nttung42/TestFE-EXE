import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.querySelector("#scene");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020716, 0.058);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(-6.8, 11.5, 12.5);
camera.lookAt(1.2, 1.2, -1.8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.46,
  0.58,
  0.18
);
composer.addPass(bloomPass);

const ambient = new THREE.AmbientLight(0xd6f3ff, 0.72);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xe7fbff, 3.8);
keyLight.position.set(-4, 9, 9);
scene.add(keyLight);

const acidLight = new THREE.PointLight(0x58b7ff, 8, 18, 1.8);
acidLight.position.set(0, 2.8, 2.4);
scene.add(acidLight);

const backLight = new THREE.PointLight(0xd8f7ff, 6, 20, 2);
backLight.position.set(-6, 5, -8);
scene.add(backLight);

const crowd = [];
const rayTargets = [];
const pointer = new THREE.Vector2(10, 10);
const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
let hoveredPerson = null;

const botBodyGeometry = new THREE.CapsuleGeometry(0.42, 0.82, 10, 24);
const botHeadGeometry = new THREE.BoxGeometry(1.08, 0.78, 0.72);
const botEyeGeometry = new THREE.BoxGeometry(0.16, 0.08, 0.045);
const botEarGeometry = new THREE.SphereGeometry(0.15, 18, 18);
const botAntennaGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.38, 12);
const botNodeGeometry = new THREE.SphereGeometry(0.085, 16, 16);

function makeMaterial(color, roughness = 0.42, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: color,
    emissiveIntensity: 0.03
  });
}

const darkMaterials = [
  makeMaterial(0x081528, 0.52, 0.18),
  makeMaterial(0x0b1d34, 0.48, 0.16),
  makeMaterial(0x030915, 0.64, 0.1),
  makeMaterial(0x132a44, 0.44, 0.18)
];

const activeMaterial = new THREE.MeshStandardMaterial({
  color: 0x74caff,
  roughness: 0.26,
  metalness: 0.06,
  emissive: 0x2f9cff,
  emissiveIntensity: 0.95
});

function createPerson({ x, z, scale = 1, highlighted = false, phase = 0 }) {
  const person = new THREE.Group();
  person.position.set(x, 0, z);
  person.scale.setScalar(scale);
  person.userData.phase = phase;
  person.userData.highlighted = highlighted;
  person.userData.targetGlow = highlighted ? 1 : 0;
  person.userData.glow = highlighted ? 1 : 0;

  const material = highlighted ? activeMaterial.clone() : darkMaterials[Math.floor(Math.random() * darkMaterials.length)].clone();
  material.userData.baseColor = material.color.clone();
  material.userData.baseEmissive = material.emissive.clone();
  material.userData.baseEmissiveIntensity = material.emissiveIntensity;

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: highlighted ? 0xeaf9ff : 0x1b4468,
    roughness: 0.22,
    metalness: 0.05,
    emissive: highlighted ? 0x8fe0ff : 0x123050,
    emissiveIntensity: highlighted ? 1.35 : 0.22
  });
  eyeMaterial.userData.baseColor = eyeMaterial.color.clone();
  eyeMaterial.userData.baseEmissive = eyeMaterial.emissive.clone();
  eyeMaterial.userData.baseEmissiveIntensity = eyeMaterial.emissiveIntensity;

  const body = new THREE.Mesh(botBodyGeometry, material);
  body.position.y = 1.05;
  body.scale.set(0.9, 1.02, 0.64);
  person.add(body);

  const neck = new THREE.Mesh(botNodeGeometry, material);
  neck.position.y = 1.68;
  neck.scale.set(1.4, 0.7, 1.4);
  person.add(neck);

  const head = new THREE.Mesh(botHeadGeometry, material);
  head.position.y = 2.16;
  head.scale.set(1, 1, 0.86);
  person.add(head);

  const leftEye = new THREE.Mesh(botEyeGeometry, eyeMaterial);
  leftEye.position.set(-0.22, 2.2, 0.325);
  person.add(leftEye);

  const rightEye = new THREE.Mesh(botEyeGeometry, eyeMaterial);
  rightEye.position.set(0.22, 2.2, 0.325);
  person.add(rightEye);

  const leftEar = new THREE.Mesh(botEarGeometry, material);
  leftEar.position.set(-0.66, 2.16, 0);
  person.add(leftEar);

  const rightEar = new THREE.Mesh(botEarGeometry, material);
  rightEar.position.set(0.66, 2.16, 0);
  person.add(rightEar);

  const antenna = new THREE.Mesh(botAntennaGeometry, material);
  antenna.position.y = 2.72;
  antenna.rotation.z = -0.22;
  person.add(antenna);

  const node = new THREE.Mesh(botNodeGeometry, eyeMaterial);
  node.position.set(-0.04, 2.94, 0);
  person.add(node);

  person.userData.meshes = [body, neck, head, leftEar, rightEar, antenna];
  person.userData.glowMeshes = [leftEye, rightEye, node];
  person.userData.baseScale = scale;
  person.userData.baseY = person.position.y;
  person.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.person = person;
      rayTargets.push(child);
    }
  });

  scene.add(person);
  crowd.push(person);
  return person;
}

function buildCrowd() {
  const rows = [
    { z: 5.4, count: 7, spread: 13.5, scale: 1.62 },
    { z: 2.7, count: 8, spread: 14.5, scale: 1.36 },
    { z: 0.3, count: 9, spread: 15.5, scale: 1.14 },
    { z: -2.2, count: 8, spread: 14.2, scale: 0.96 },
    { z: -4.3, count: 7, spread: 12.5, scale: 0.8 },
    { z: -6.1, count: 6, spread: 10.2, scale: 0.67 }
  ];

  rows.forEach((row, rowIndex) => {
    for (let i = 0; i < row.count; i += 1) {
      const t = row.count === 1 ? 0.5 : i / (row.count - 1);
      const x = (t - 0.5) * row.spread + (Math.random() - 0.5) * 0.92;
      const z = row.z + (Math.random() - 0.5) * 0.72;
      const isHero = rowIndex === 1 && i === Math.floor(row.count / 2);
      const person = createPerson({
        x: isHero ? 0 : x,
        z: isHero ? 1.7 : z,
        scale: isHero ? 1.42 : row.scale * (0.92 + Math.random() * 0.22),
        highlighted: isHero,
        phase: Math.random() * Math.PI * 2
      });
      person.rotation.y = -0.35 + (Math.random() - 0.5) * 0.48;
    }
  });
}

function createFloor() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshStandardMaterial({
      color: 0x020716,
      roughness: 0.74,
      metalness: 0.1,
      emissive: 0x061d3a,
      emissiveIntensity: 0.06
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);
}

function createGlowHalo(person) {
  const halo = new THREE.PointLight(0x7bd8ff, 0, 5.8, 1.4);
  halo.position.set(0, 2.2, 0.2);
  person.add(halo);
  person.userData.halo = halo;
}

function setPersonTarget(person, active) {
  if (!person || person.userData.highlighted) return;
  person.userData.targetGlow = active ? 1 : 0;
}

function updatePersonGlow(person, delta, elapsed) {
  const target = person.userData.highlighted ? 1 : person.userData.targetGlow;
  person.userData.glow = THREE.MathUtils.damp(person.userData.glow, target, 7.5, delta);
  const glow = person.userData.glow;
  const pulse = 1 + Math.sin(elapsed * 3.2 + person.userData.phase) * 0.025 * glow;
  const lift = glow * 0.16;
  const grow = 1 + glow * 0.13;

  person.position.y = person.userData.baseY + lift;
  person.scale.setScalar(person.userData.baseScale * grow * pulse);

  person.userData.meshes.forEach((mesh) => {
    const material = mesh.material;
    material.color.copy(material.userData.baseColor).lerp(new THREE.Color(0x82d8ff), glow);
    material.emissive.copy(material.userData.baseEmissive).lerp(new THREE.Color(0x3ea7ff), glow);
    material.emissiveIntensity = material.userData.baseEmissiveIntensity + glow * 1.25;
  });

  person.userData.glowMeshes.forEach((mesh) => {
    const material = mesh.material;
    material.color.copy(material.userData.baseColor).lerp(new THREE.Color(0xf0fbff), glow);
    material.emissive.copy(material.userData.baseEmissive).lerp(new THREE.Color(0x9de5ff), glow);
    material.emissiveIntensity = material.userData.baseEmissiveIntensity + glow * 2.1;
  });

  if (!person.userData.halo) createGlowHalo(person);
  person.userData.halo.intensity = glow * 6.5;
}

function updateHover() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(rayTargets, false);
  const nextPerson = hits.length ? hits[0].object.userData.person : null;

  if (nextPerson !== hoveredPerson) {
    setPersonTarget(hoveredPerson, false);
    hoveredPerson = nextPerson;
    setPersonTarget(hoveredPerson, true);
    canvas.classList.toggle("is-hovering", Boolean(hoveredPerson));
  }
}

function movePointer(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function leavePointer() {
  pointer.set(10, 10);
  setPersonTarget(hoveredPerson, false);
  hoveredPerson = null;
  canvas.classList.remove("is-hovering");
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  updateHover();

  crowd.forEach((person) => {
    person.rotation.y += Math.sin(elapsed * 0.7 + person.userData.phase) * 0.0008;
    updatePersonGlow(person, delta, elapsed);
  });

  acidLight.intensity = 7 + Math.sin(elapsed * 1.4) * 1.1;
  composer.render();
  requestAnimationFrame(animate);
}

buildCrowd();
createFloor();
window.addEventListener("pointermove", movePointer);
window.addEventListener("pointerleave", leavePointer);
window.addEventListener("resize", resize);
animate();
