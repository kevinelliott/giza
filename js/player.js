import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';

// Merge every collidable mesh (in world space) into one position-only
// geometry and build a BVH over it for fast capsule queries.
export function buildCollider(scene, collidables) {
  scene.updateMatrixWorld(true);
  const geoms = [];
  for (const mesh of collidables) {
    let g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    geoms.push(g);
  }
  const merged = mergeGeometries(geoms, false);
  merged.boundsTree = new MeshBVH(merged);
  const collider = new THREE.Mesh(merged);
  collider.visible = false;
  return collider;
}

const GRAVITY = -24;
const SPEED_WALK = 4.5;
const SPEED_RUN = 9.5;
const JUMP = 8.2;
const FLY_SPEED = 45;
const STEP_HEIGHT = 0.6;     // max ledge/stair the player auto-steps over

export class Player {
  constructor(camera, collider) {
    this.camera = camera;
    this.collider = collider;
    this.radius = 0.35;
    this.height = 1.8;
    this.eye = 1.62;
    this.position = new THREE.Vector3(0, 50, 0);
    this.velocity = new THREE.Vector3();
    this.vXZ = new THREE.Vector3();       // smoothed horizontal velocity
    this.speedXZ = 0;
    this.bobPhase = 0;
    this.bobY = 0;
    this.onGround = false;
    this.fly = false;

    // capsule endpoints relative to feet position
    this.segTop = new THREE.Vector3(0, this.height - this.radius, 0);
    this.segBot = new THREE.Vector3(0, this.radius, 0);

    // scratch objects
    this._seg = new THREE.Line3(new THREE.Vector3(), new THREE.Vector3());
    this._box = new THREE.Box3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._cap = new THREE.Vector3();
    this._corr = new THREE.Vector3();
  }

  teleport(p) {
    this.position.set(p.x, p.y, p.z);
    this.velocity.set(0, 0, 0);
    this.vXZ.set(0, 0, 0);
    this.bobY = 0;
    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.set(
      this.position.x, this.position.y + this.eye + this.bobY, this.position.z);
  }

  // Compass heading in degrees (0 = North / -Z, increasing clockwise).
  headingDeg() {
    this.camera.getWorldDirection(this._fwd);
    let a = Math.atan2(this._fwd.x, -this._fwd.z) * 180 / Math.PI;
    return (a + 360) % 360;
  }

  // Desired move direction. Supports analog input.moveX/moveY (touch) in
  // addition to the WASD booleans.
  _heading(input) {
    this.camera.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-6) this._fwd.set(0, 0, -1);
    this._fwd.normalize();
    this._right.crossVectors(this._fwd, this._up).normalize();
    this._wish.set(0, 0, 0);
    const mx = input.moveX || 0, my = input.moveY || 0;
    if (mx !== 0 || my !== 0) {
      this._wish.addScaledVector(this._fwd, my);
      this._wish.addScaledVector(this._right, mx);
      const m = this._wish.length();
      if (m > 1) this._wish.multiplyScalar(1 / m);   // clamp magnitude to 1
    } else {
      if (input.forward) this._wish.add(this._fwd);
      if (input.back) this._wish.sub(this._fwd);
      if (input.right) this._wish.add(this._right);
      if (input.left) this._wish.sub(this._right);
      if (this._wish.lengthSq() > 0) this._wish.normalize();
    }
  }

  update(delta, input) {
    delta = Math.min(delta, 0.05);
    this._heading(input);

    if (this.fly) {
      const sp = (input.sprint ? FLY_SPEED * 2.4 : FLY_SPEED);
      this.position.addScaledVector(this._wish, sp * delta);
      if (input.jump) this.position.y += sp * delta;
      if (input.crouch) this.position.y -= sp * delta;
      this.velocity.set(0, 0, 0);
      this.vXZ.set(0, 0, 0);
      this.bobY *= 0.8;
      this.syncCamera();
      return;
    }

    const speed = input.sprint ? SPEED_RUN : SPEED_WALK;
    this.velocity.y += GRAVITY * delta;
    if (this.onGround && input.jump) { this.velocity.y = JUMP; this.onGround = false; }

    // Smoothly accelerate horizontal velocity toward the desired direction.
    this._target.copy(this._wish).multiplyScalar(speed);
    const lambda = this._wish.lengthSq() > 0 ? 11 : 16;   // accel vs. braking
    this.vXZ.x = THREE.MathUtils.damp(this.vXZ.x, this._target.x, lambda, delta);
    this.vXZ.z = THREE.MathUtils.damp(this.vXZ.z, this._target.z, lambda, delta);

    // Vertical move + ground resolve.
    this.position.y += this.velocity.y * delta;
    let corr = this._depen();
    this.onGround = corr.y > Math.abs(this.velocity.y * delta) * 0.25 + 1e-5;
    if (this.onGround && this.velocity.y < 0) this.velocity.y = 0;

    // Horizontal move, then slide along walls.
    const dx = this.vXZ.x * delta, dz = this.vXZ.z * delta;
    const startX = this.position.x, startZ = this.position.z;
    this.position.x += dx; this.position.z += dz;
    corr = this._depen();
    const n = this._v1.set(corr.x, 0, corr.z);
    if (n.lengthSq() > 1e-9) {
      n.normalize();
      const into = this.vXZ.dot(n);
      if (into < 0) this.vXZ.addScaledVector(n, -into);
    }

    // Auto step-up: if blocked while grounded, retry the move lifted by
    // STEP_HEIGHT and settle back down — lets us climb stairs and curbs.
    const want = Math.hypot(dx, dz);
    const got = Math.hypot(this.position.x - startX, this.position.z - startZ);
    if (this.onGround && want > 1e-4 && got < want * 0.85) {
      const sx = this.position.x, sy = this.position.y, sz = this.position.z;
      this.position.set(startX, sy + STEP_HEIGHT, startZ);
      this._depen();
      this.position.x += dx; this.position.z += dz;
      this._depen();
      this.position.y -= STEP_HEIGHT + 0.05;
      const landed = this._depen();
      const stepGot = Math.hypot(this.position.x - startX, this.position.z - startZ);
      if (stepGot > got + 0.02 && landed.y > -1e-3) {
        this.onGround = true;
      } else {
        this.position.set(sx, sy, sz);    // step didn't help; keep the slide result
      }
    }
    this.speedXZ = Math.hypot(this.vXZ.x, this.vXZ.z);

    // Head-bob while walking on the ground.
    if (this.onGround && this.speedXZ > 0.4) this.bobPhase += delta * this.speedXZ * 1.6;
    const amp = Math.min(this.speedXZ * 0.011, 0.075);
    this.bobY = (this.onGround ? Math.sin(this.bobPhase * 2) * amp : this.bobY * 0.85);

    this.syncCamera();

    if (this.position.y < -120) this.teleport({ x: 230, y: 6, z: -220 });
  }

  // Push the capsule out of any overlapping geometry. Returns the applied
  // correction vector (a positive Y means we were lifted = standing on it).
  _depen() {
    const seg = this._seg;
    seg.start.copy(this.position).add(this.segTop);
    seg.end.copy(this.position).add(this.segBot);
    const before = this._cap.copy(seg.start);

    this._box.makeEmpty();
    this._box.expandByPoint(seg.start);
    this._box.expandByPoint(seg.end);
    this._box.min.addScalar(-this.radius);
    this._box.max.addScalar(this.radius);

    const r = this.radius;
    const tri = this._v2, cap = this._target;   // reuse scratch (safe here)
    this.collider.geometry.boundsTree.shapecast({
      intersectsBounds: box => box.intersectsBox(this._box),
      intersectsTriangle: t => {
        const d = t.closestPointToSegment(seg, tri, cap);
        if (d < r) {
          const depth = r - d;
          const dir = cap.sub(tri).normalize();
          seg.start.addScaledVector(dir, depth);
          seg.end.addScaledVector(dir, depth);
        }
      }
    });

    const corr = this._corr.copy(seg.start).sub(before);
    const offset = Math.max(0, corr.length() - 1e-5);
    if (offset > 0) { corr.normalize().multiplyScalar(offset); this.position.add(corr); }
    return corr;
  }
}
