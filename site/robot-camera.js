import * as THREE from 'three';

// The target is in the selected assembly's own coordinates. The wrist can move
// while a shot is in progress and still stay in frame.
const shots = {
  gripper:     { target: [0, .02, .46],    view: [.52, .82, 1.12], radius: 3.45 },
  lift:        { target: [0, 1.63, .17],   view: [-1.1, .46, 1.25], radius: 7.15 },
  wheels:      { target: [0, .02, 0],      view: [1.36, .55, .65], radius: 3.05 },
  intake:      { target: [0, .03, .51],    view: [.6, .62, 1.4], radius: 4.65 },
  electronics: { target: [0, .24, -.04],   view: [-.53, 1.9, .95], radius: 3.9 },
  chassis:     { target: [0, .52, .05],    view: [-1.15, .71, 1.15], radius: 7.9 }
};
const clamp = x => Math.min(1, Math.max(0, x));
const ease = x => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3)/2;

export function createCameraDirector(camera, controls, container, root, assemblies, motion) {
  const sidePanel = document.querySelector('.component-studio');
  const focus = new THREE.Vector3(), direction = new THREE.Vector3();
  const angle = new THREE.Spherical(), destination = new THREE.Spherical();
  const lastFocus = new THREE.Vector3(), trackingStep = new THREE.Vector3();
  let selected = null, flight = null, home = null, lensShift = 0;
  let freeOrbit = false, room = 1;

  function dimensions() {
    // The mobile layout gives the camera its own row above the text.
    room = innerWidth <= 760 ? 1 : Math.max(.42, Math.min(1, sidePanel.getBoundingClientRect().left / Math.max(1, container.clientWidth)));
  }
  function shiftLens(value) {
    lensShift = value;
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    if (Math.abs(value) < .0001) {
      if (camera.view?.enabled) camera.clearViewOffset();
    } else camera.setViewOffset(width, height, value * width, -value * height * .16, width, height);
  }
  function snapshot() {
    return {
      target: controls.target.clone(),
      angle: new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),
      shift: lensShift
    };
  }
  function startFlight(key, returning = false, immediate = false) {
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    const from = snapshot();
    if (!selected && !returning && !flight?.returning) home = from;
    selected = key;
    freeOrbit = false;
    dimensions();
    flight = { from, returning, start: performance.now(), duration: immediate || motion.paused || motion.reduced ? 0 : returning ? 760 : 1120 };
    controls.enabled = false;
    container.dataset.shot = key || '';
    container.dataset.camera = 'moving';
  }
  function locate() {
    const shot = shots[selected];
    focus.fromArray(shot.target);
    assemblies[selected].localToWorld(focus);
    direction.fromArray(shot.view).applyQuaternion(root.quaternion).normalize();
    destination.setFromVector3(direction);
    destination.radius = shot.radius * Math.max(1, .91 / (camera.aspect * room));
  }
  function update(now) {
    if (!flight && !selected) return;
    if (selected) locate();
    if (!flight) {
      if (!freeOrbit) {
        trackingStep.copy(focus).sub(lastFocus);
        controls.target.add(trackingStep);
        camera.position.add(trackingStep);
      }
      lastFocus.copy(focus);
      return;
    }
    const { from, returning, start, duration } = flight;
    const t = duration && !motion.paused && !motion.reduced ? clamp((now - start) / duration) : 1;
    const k = ease(t);
    if (returning) {
      focus.copy(home.target);
      destination.copy(home.angle);
    }
    const arc = Math.atan2(Math.sin(destination.theta - from.angle.theta), Math.cos(destination.theta - from.angle.theta));
    angle.theta = from.angle.theta + arc * k;
    angle.phi = THREE.MathUtils.lerp(from.angle.phi, destination.phi, k) - .055 * Math.sin(Math.PI * k);
    angle.radius = THREE.MathUtils.lerp(from.angle.radius, destination.radius, k) + .65 * Math.sin(Math.PI*k);
    controls.target.lerpVectors(from.target, focus, k);
    camera.position.setFromSpherical(angle).add(controls.target);
    shiftLens(THREE.MathUtils.lerp(from.shift, returning ? home.shift : (1-room) * .5, k));
    if (t >= 1) {
      flight = null;
      lastFocus.copy(focus);
      controls.enabled = true;
      container.dataset.camera = 'ready';
    }
  }
  controls.addEventListener('start', () => { freeOrbit = true; });
  return {
    select(key) { startFlight(key); },
    leave(immediate = false) {
      if (!home || !selected) return;
      startFlight(null, true, immediate);
      if (immediate) { update(performance.now() + 1); controls.update(); }
    },
    resize() {
      if (!selected) return;
      dimensions();
      if (!flight) { startFlight(selected, false, true); update(performance.now()); }
    },
    update
  };
}
