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

export class Player {
  constructor(camera, collider) {
    this.camera = camera;
    this.collider = collider;
    this.radius = 0.35;
    this.height = 1.8;
    this.eye = 1.62;
    this.position = new THREE.Vector3(0, 50, 0);
    this.velocity = new THREE.Vector3();
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
  }

  teleport(p) {
    this.position.set(p.x, p.y, p.z);
    this.velocity.set(0, 0, 0);
    this.syncCamera();
  }

  syncCamera() {
    this.camera.position.set(this.position.x, this.position.y + this.eye, this.position.z);
  }

  // Horizontal heading derived from where the camera is looking.
  _heading(input) {
    this.camera.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    if (this._fwd.lengthSq() < 1e-6) this._fwd.set(0, 0, -1);
    this._fwd.normalize();
    this._right.crossVectors(this._fwd, new THREE.Vector3(0, 1, 0)).normalize();
    this._wish.set(0, 0, 0);
    if (input.forward) this._wish.add(this._fwd);
    if (input.back) this._wish.sub(this._fwd);
    if (input.right) this._wish.add(this._right);
    if (input.left) this._wish.sub(this._right);
    if (this._wish.lengthSq() > 0) this._wish.normalize();
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
      this.syncCamera();
      return;
    }

    const speed = input.sprint ? SPEED_RUN : SPEED_WALK;
    this.velocity.y += GRAVITY * delta;
    if (this.onGround && input.jump) { this.velocity.y = JUMP; this.onGround = false; }

    this.position.addScaledVector(this._wish, speed * delta);
    this.position.y += this.velocity.y * delta;

    this._collide(delta);
    this.syncCamera();

    if (this.position.y < -120) this.teleport({ x: 230, y: 6, z: -220 });
  }

  _collide(delta) {
    const seg = this._seg;
    seg.start.copy(this.position).add(this.segTop);
    seg.end.copy(this.position).add(this.segBot);
    const before = this._v1.copy(seg.start);

    this._box.makeEmpty();
    this._box.expandByPoint(seg.start);
    this._box.expandByPoint(seg.end);
    this._box.min.addScalar(-this.radius);
    this._box.max.addScalar(this.radius);

    const r = this.radius;
    const tri = this._v2, cap = new THREE.Vector3();
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

    // Resolved feet position is wherever the (top of the) segment ended up.
    const delta3 = this._v2.copy(seg.start).sub(before);
    const vertical = this.velocity.y * delta;
    this.onGround = delta3.y > Math.abs(vertical) * 0.25 + 1e-5;

    const offset = Math.max(0, delta3.length() - 1e-5);
    if (offset > 0) {
      delta3.normalize().multiplyScalar(offset);
      this.position.add(delta3);
    }

    if (this.onGround) {
      this.velocity.set(0, 0, 0);
    } else {
      // slide: remove velocity component pushing into the surface
      delta3.normalize();
      this.velocity.addScaledVector(delta3, -delta3.dot(this.velocity));
    }
  }
}
