import * as THREE from "three";
import Experience from "#experience/Experience.js";

export default class PhysicsDebug {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.physics = this.experience.physics;

    this.debugGeometry = new THREE.BufferGeometry();
    this.debugMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.debugMesh = new THREE.LineSegments(
      this.debugGeometry,
      this.debugMaterial
    );

    // Initialize geometry once
    const { vertices } = this.physics.world.debugRender();
    this._setVertices(vertices);

    this.scene.add(this.debugMesh);
  }

  _setVertices(vertices) {
    // Recreate attribute to match new vertex count
    const positionAttr = new THREE.Float32BufferAttribute(vertices, 3);
    this.debugGeometry.setAttribute("position", positionAttr);
    this.debugGeometry.computeBoundingSphere();
    this.debugGeometry.attributes.position.needsUpdate = true;
  }

  update() {
    // Fetch fresh debug vertices every frame
    const { vertices } = this.physics.world.debugRender();

    const position = this.debugGeometry.getAttribute("position");
    if (!position || position.count * 3 !== vertices.length) {
      // Vertex count changed; rebuild attribute
      this._setVertices(vertices);
    } else {
      // Update in place for performance
      position.array.set(vertices);
      position.needsUpdate = true;
      this.debugGeometry.computeBoundingSphere();
    }
  }

  destroy() {
    this.scene.remove(this.debugMesh);
    this.debugGeometry.dispose();
    this.debugMaterial.dispose();
  }
}
