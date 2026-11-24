import * as THREE from 'three';

const clamp = t => Math.max(0, Math.min(1, t));
function smooth(from, to, value) {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}
const mix = THREE.MathUtils.lerp;

// Expand the original camera frustum to the entire window. At t=0 the same
// pixels of the same mesh lie under the pointer on both rendering surfaces.
export function createBadgePresentation({ host, camera, renderer, motion, restore }) {
  const projected = new THREE.Vector3(), right = new THREE.Vector3();
  const shift = new THREE.Vector3();
  let shot = null;
  function resizeSurface() {
    const stage = shot.ui.stage;
    if (stage.clientWidth === shot.w && stage.clientHeight === shot.h) return;
    shot.w = Math.max(stage.clientWidth, 1);
    shot.h = Math.max(stage.clientHeight, 1);
    renderer.setSize(shot.w, shot.h, false);
  }
  function updateCamera(now) {
    if (!shot) return;
    resizeSurface();
    const { w, h, ui, badge, base } = shot;
    const rect = host.getBoundingClientRect();
    const instant = motion.reduced || motion.paused;
    const elapsed = Math.max(0, now - shot.start);
    const t = shot.t = instant ? shot.goal : shot.goal === 1 ? clamp(elapsed / 1160) : Math.max(0, shot.from - elapsed / 820);
    const k = smooth(0, 1, t);
    const sourceFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base.fov / 2)) * h / Math.max(1, rect.height)));
    const finalFov = 35;
    const halfFov = Math.tan(THREE.MathUtils.degToRad(finalFov / 2));
    const aspect = w / h;
    const distance = Math.max(2.45 / (.69 * 2 * halfFov), 1.68 / (.75 * aspect * 2 * halfFov));
    const xOffset = (w / 2 - rect.left - rect.width / 2) * (1-k);
    const yOffset = (h / 2 - rect.top - rect.height / 2) * (1-k);
    camera.aspect = aspect;
    camera.fov = mix(sourceFov, finalFov, k);
    camera.position.set(mix(base.position.x, badge.anchor.x, k), mix(base.position.y, .12, k), mix(base.position.z, distance + 1.12, k));
    camera.setViewOffset(w, h, xOffset, yOffset, w, h);
    camera.updateMatrixWorld();
    const crop = 1 - smooth(0, .64, t);
    ui.stage.style.clipPath = crop ? 'inset(' + [rect.top, w-rect.right, h-rect.bottom, rect.left].map(v => Math.max(0,v)*crop+'px').join(' ') + ' round '+8*crop+'px)' : 'none';
    ui.panel.style.setProperty('--close-opacity', String(smooth(0, .3, t)));
    ui.panel.dataset.readable = String(t > .85 && shot.goal === 1);
    if (shot.goal === 0 && t <= 0) finish();
  }
  function deformation(badge) {
    if (!shot) return null;
    const t = shot.t;
    const lift = smooth(.01, .95, t);
    const bow = Math.sin(Math.PI*t);
    const twist = smooth(.16, .88, t);
    if (badge === shot.badge) {
      shift.set(.19*bow, .26*lift - .28*bow, 1.12*lift + .09*bow);
      return { shift, yaw: mix(badge.angle,shot.backYaw,twist), pitch: -.18*bow, roll: -.13*bow, damp: 1-lift, fixedAnchor:true };
    }
    shift.set(Math.sign(badge.index-shot.badge.index)*5.8*lift, -.42*lift, -1.4*lift);
    return { shift, yaw: badge.angle, pitch: 0, roll: 0, damp:1, fixedAnchor:false };
  }
  function positionLink() {
    if (!shot || shot.t < .74) return;
    const { badge, w, h, ui } = shot;
    // Project the printed button area on the reverse into the accessible DOM.
    projected.set(0, -.68, .01);
    right.set(.605, -.68, .01);
    badge.back.localToWorld(projected).project(camera);
    badge.back.localToWorld(right).project(camera);
    const width = Math.min(w-36, Math.max(132, Math.abs(right.x-projected.x)*w));
    ui.link.style.left = (projected.x+1)*w/2+'px';
    ui.link.style.top = (1-projected.y)*h/2+'px';
    ui.link.style.width = width+'px';
    ui.link.style.height = Math.min(53,Math.max(44,width*.21))+'px';
  }
  function finish() {
    const closing = shot;
    shot = null;
    host.append(renderer.domElement);
    camera.clearViewOffset();
    camera.position.copy(closing.base.position);
    camera.fov = closing.base.fov;
    closing.ui.link.removeAttribute('style');
    closing.ui.stage.style.clipPath = '';
    restore(closing.badge);
    closing.done?.();
  }
  return {
    get active() { return shot !== null; },
    open(badge, ui) {
      shot = { badge, ui, base: { fov: camera.fov, position:camera.position.clone() }, w:0,h:0,t:0,goal:1,from:0,start:performance.now(),
        backYaw: Math.PI + Math.round((badge.angle - Math.PI)/(2*Math.PI))*2*Math.PI };
      ui.stage.append(renderer.domElement);
      updateCamera(performance.now());
    },
    close(done, immediate = false) {
      if (!shot) { done(); return; }
      shot.done = done;
      shot.goal = 0;
      shot.from = shot.t;
      shot.start = performance.now();
      if (immediate || motion.reduced || motion.paused || shot.from === 0) finish();
    },
    updateCamera, deformation, positionLink
  };
}
