import * as THREE from "three";
import Experience from "../Experience.js";

const COUNT = 165;
const SPACING = 5;

const COLS = Math.ceil(Math.sqrt(COUNT)); // number of columns
const ROWS = Math.ceil(COUNT / COLS);

const offsetX = (COLS - 1) * 0.5 * SPACING;
const offsetZ = (ROWS - 1) * 0.5 * SPACING;

const FIRST_RING_MULTIPLIER = 13; // multiplier for the first ring

export default class ToySoldier {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.camera = this.experience.camera;
    this.time = this.experience.time;

    this.toySoldierScene = this.resources.items.toySoldierModel.scene;
    this.toySoldierModel = this.toySoldierScene.children[0];
    this.toySoldierCheeringVATTexture =
      this.resources.items.toySoldierCheeringVATTexture;
    this.gradientTexture = this.resources.items.gradientTexture;
    this.gradientTexture.colorSpace = THREE.SRGBColorSpace;
    this.gradientTexture.flipY = false;

    // this.toySoldierModel.material = new THREE.MeshStandardMaterial();
    this.toySoldierModel.material.map = this.gradientTexture;

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
      posTexture: { value: this.toySoldierCheeringVATTexture },
      uTime: { value: 0 },
      totalFrames: { value: 25 },
      fps: { value: 15 },
    };

    this.toySoldierModel.material.onBeforeCompile = (shader) => {
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
    this.toySoldierModel.geometry.computeBoundingBox();
    const baseBox = this.toySoldierModel.geometry.boundingBox.clone();
    // baseBox.min.addScalar(-1);
    // baseBox.max.addScalar(1);

    // Create the InstancedMesh
    this.instancedMesh = new THREE.InstancedMesh(
      this.toySoldierModel.geometry,
      this.toySoldierModel.material,
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
    const toySoldierRadius = 0.5 * Math.max(size.x, size.z);

    // "Spacing" along the circle between characters (arc length)
    const ARC_SPACING = toySoldierRadius * 5; // tweak this factor for more/less gap

    // Extra padding between rings
    const RING_PADDING = toySoldierRadius * 1.5;

    // Construct instances and bounding boxes in concentric rings
    // Construct instances and bounding boxes in concentric rings
    let placed = 0;
    let ringIndex = 0;

    // Taille "naturelle" d’un anneau
    const BASE_RING_SIZE = 2 * toySoldierRadius + RING_PADDING;

    // Rayon du premier cercle (loin du centre)
    const START_RING_RADIUS = BASE_RING_SIZE * 11.5; // tu peux ajuster

    // Distance moyenne entre chaque cercle
    const RING_STEP = BASE_RING_SIZE * 1.1;

    // Jitter radial max (aléatoire sur le rayon)
    const RADIAL_JITTER = BASE_RING_SIZE * 0.4;

    // Distance minimale entre deux soldats (en mètres dans le monde)
    const MIN_SPACING = toySoldierRadius * 3.0; // ajuste si besoin
    const MIN_SPACING_SQ = MIN_SPACING * MIN_SPACING;

    // On garde en mémoire les positions déjà placées pour vérifier les distances
    const placedPositions = []; // { x, z }

    while (placed < COUNT) {
      // Rayon "théorique" de l’anneau
      const baseRadius = START_RING_RADIUS + ringIndex * RING_STEP;

      const circumference = 2 * Math.PI * baseRadius;
      const capacity = Math.max(1, Math.floor(circumference / ARC_SPACING));

      for (let j = 0; j < capacity && placed < COUNT; j++) {
        const t = j / capacity;
        const baseAngle = t * Math.PI * 2;

        let radius, angleAround, x, z;
        let attempts = 0;
        let valid = false;

        // On essaie plusieurs jitters jusqu’à respecter MIN_SPACING
        while (attempts < 20 && !valid) {
          // On garde l’angle fixe pour préserver le spacing "sur l’anneau"
          angleAround = baseAngle;

          // Jitter radial aléatoire
          const jitter = (Math.random() * 2 - 1) * RADIAL_JITTER;
          radius = baseRadius + jitter;

          x = Math.cos(angleAround) * radius;
          z = Math.sin(angleAround) * radius;

          // Vérifier la distance avec tous les autres soldats déjà placés
          valid = true;
          for (let k = 0; k < placedPositions.length; k++) {
            const dx = x - placedPositions[k].x;
            const dz = z - placedPositions[k].z;
            if (dx * dx + dz * dz < MIN_SPACING_SQ) {
              valid = false;
              break;
            }
          }

          attempts++;
        }

        // Si on n'a pas trouvé de bonne position après plusieurs essais,
        // on retombe sur le rayon de base sans jitter
        if (!valid) {
          radius = baseRadius;
          angleAround = baseAngle;
          x = Math.cos(angleAround) * radius;
          z = Math.sin(angleAround) * radius;
        }

        placedPositions.push({ x, z });

        position.set(x, 0, z);

        // Les faire regarder vers le centre (en supposant que le modèle regarde +Z)
        const rotationY = Math.atan2(x, z) + Math.PI;
        matrix.makeRotationY(rotationY);
        matrix.setPosition(position);

        this.boxes[placed].copy(baseBox);
        this.boxes[placed].applyMatrix4(matrix);

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
