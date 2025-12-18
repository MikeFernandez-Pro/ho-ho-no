import * as THREE from "three";
import Experience from "../Experience.js";

const COUNT = 89;

export default class Santa {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.camera = this.experience.camera;
    this.time = this.experience.time;

    this.santaScene = this.resources.items.santaModel.scene;
    this.santaModel = this.santaScene.children[0];
    this.santaPushUpVATTexture = this.resources.items.santaPushUpVATTexture;
    this.gradientTexture = this.resources.items.gradientTexture;

    this.santaModel.material.map = this.gradientTexture;

    this.instancedMesh = null;
    this.instanceIdAttr = null;
    this.tempMatrix = new THREE.Matrix4();
    this.projScreenMatrix = new THREE.Matrix4();
    this.frustum = new THREE.Frustum();
    this.boxes = new Array(COUNT).fill(null).map(() => new THREE.Box3());
    this.originalMatrices = new Array(COUNT)
      .fill(null)
      .map(() => new THREE.Matrix4());

    this.uniforms = {
      uColorTexture: { value: this.santaModel.material.map },
      posTexture: { value: this.santaPushUpVATTexture },
      uTime: { value: 0 },
      totalFrames: { value: 25 },
      fps: { value: 15 },
    };

    this.santaModel.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime; // share uniform
      shader.uniforms.posTexture = this.uniforms.posTexture;
      shader.uniforms.totalFrames = this.uniforms.totalFrames;
      shader.uniforms.fps = this.uniforms.fps;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
         #include <common>

         attribute vec2 uv1; // define uv1 attribute for vertex_anim uv set
     uniform sampler2D posTexture; // positions.exr or positions.png

     uniform float uTime; // time in seconds
     uniform float totalFrames;
     uniform float fps; 	

     attribute vec3 instancePosition;
     attribute float instanceId;
     `
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
         #include <begin_vertex>

        float frame = mod(uTime * fps + float(instanceId * 20.0), totalFrames) / totalFrames;

 vec4 texturePos = texture(posTexture, vec2(uv1.x, uv1.y - frame));
 transformed  += texturePos.xzy;
     `
      );
    };

    // Create Frustum for culling instances
    this.projScreenMatrix = new THREE.Matrix4();
    this.projScreenMatrix.multiplyMatrices(
      this.camera.instance.projectionMatrix,
      this.camera.instance.matrixWorldInverse
    );

    this.frustum = new THREE.Frustum();
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    // Retrieve default mesh bounding box
    this.santaModel.geometry.computeBoundingBox();
    const baseBox = this.santaModel.geometry.boundingBox.clone();
    // baseBox.min.addScalar(-1);
    // baseBox.max.addScalar(1);

    // Create the InstancedMesh
    this.instancedMesh = new THREE.InstancedMesh(
      this.santaModel.geometry,
      this.santaModel.material,
      COUNT
    );
    this.instancedMesh.castShadow = true;
    this.instancedMesh.frustumCulled = false;

    const ids = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      ids[i] = i; // stable logical ID
    }
    this.instanceIdAttr = new THREE.InstancedBufferAttribute(ids, 1);
    this.instancedMesh.geometry.setAttribute("instanceId", this.instanceIdAttr);

    this.instancedMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    this.instancedMesh.customDepthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.posTexture = this.uniforms.posTexture;
      shader.uniforms.totalFrames = this.uniforms.totalFrames;
      shader.uniforms.fps = this.uniforms.fps;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `
          #include <common>

          attribute vec2 uv1; // define uv1 attribute for vertex_anim uv set
      uniform sampler2D posTexture; // positions.exr or positions.png

      uniform float uTime; // time in seconds
      uniform float totalFrames;
      uniform float fps;

      attribute vec3 instancePosition;
      attribute float instanceId;
      `
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
          #include <begin_vertex>

          float frame = mod(uTime * fps + float(instanceId * 20.0), totalFrames) / totalFrames;

  vec4 texturePos = texture(posTexture, vec2(uv1.x, uv1.y - frame));
  transformed  += texturePos.xzy;
      `
      );
    };

    // Create box helpers for debugging
    // boxHelpersRef.current = new Array(COUNT).fill(null).map(() => null);

    // Temporary objects to avoid allocations in loop
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    // --- Ring layout parameters ---
    // Approximate size of one Santa in XZ (used to avoid overlaps)
    const size = new THREE.Vector3();
    baseBox.getSize(size);
    const santaRadius = 0.5 * Math.max(size.x, size.z);

    // "Spacing" along the circle between characters (arc length)
    const ARC_SPACING = santaRadius * 5; // tweak this factor for more/less gap

    // Extra padding between rings
    const RING_PADDING = santaRadius * 1.5;

    // Construct instances and bounding boxes in concentric rings
    let placed = 0;
    let ringIndex = 0;

    while (placed < COUNT) {
      // Radius grows with ring index
      const radius = (ringIndex + 1) * (2 * santaRadius + RING_PADDING);

      const circumference = 2 * Math.PI * radius;
      const capacity = Math.max(1, Math.floor(circumference / ARC_SPACING));

      for (let j = 0; j < capacity && placed < COUNT; j++) {
        const t = j / capacity;
        const angleAround = t * Math.PI * 2;

        const x = Math.cos(angleAround) * radius;
        const z = Math.sin(angleAround) * radius;
        position.set(x, 0, z);

        // Make them look outward from the center
        const rotationY = Math.random() * Math.PI * 2;
        matrix.makeRotationY(rotationY);
        matrix.setPosition(position);

        // Update bounding box for this instance
        this.boxes[placed].copy(baseBox);
        this.boxes[placed].applyMatrix4(matrix);

        // Store in instanced mesh
        this.instancedMesh.setMatrixAt(placed, matrix);
        this.originalMatrices[placed].copy(matrix);

        placed++;
      }

      ringIndex++;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.instancedMesh);
  }

  update = () => {
    this.uniforms.uTime.value = -this.time.elapsed;

    if (!this.instancedMesh || !this.instanceIdAttr) return;

    this.projScreenMatrix.multiplyMatrices(
      this.camera.instance.projectionMatrix,
      this.camera.instance.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    let visibleCount = 0;

    for (let i = 0; i < COUNT; i++) {
      const box = this.boxes[i];
      const isVisible = this.frustum.intersectsBox(box);

      if (isVisible) {
        // Pack this instance into slot `visibleCount`
        this.tempMatrix.copy(this.originalMatrices[i]);
        this.instancedMesh.setMatrixAt(visibleCount, this.tempMatrix);

        // Keep logical ID stable in shader
        this.instanceIdAttr.setX(visibleCount, i);

        visibleCount++;
      }
    }

    // Only draw the visible instances
    this.instancedMesh.count = visibleCount;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instanceIdAttr.needsUpdate = true;
  };
}
