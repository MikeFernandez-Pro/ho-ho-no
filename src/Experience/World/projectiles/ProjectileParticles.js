import * as THREE from "three";
import gsap from "gsap";

import Experience from "#experience/Experience.js";

export default class ProjectileParticles {
  constructor() {
    this.experience = new Experience();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.count = 10;
    this.size = 0.5;
    this.radius = 1;

    const position = new THREE.Vector3(5, 5, 5);
    const angle = 0;

    this.createProjectileParticles(position, angle);

    window.addEventListener("click", () => {
      this.createProjectileParticles(position, angle);
    });
  }

  createProjectileParticles(position, angle) {
    // Geometry
    const positionsArray = new Float32Array(this.count * 3);
    const scalesArray = new Float32Array(this.count * 1);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      const spherical = new THREE.Spherical(
        this.radius * (0.75 + Math.random() * 0.25),
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2
      );

      const position = new THREE.Vector3();
      position.setFromSpherical(spherical);

      positionsArray[i3] = position.x;
      positionsArray[i3 + 1] = position.y;
      positionsArray[i3 + 2] = position.z;

      scalesArray[i] = Math.random() * 0.5 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positionsArray, 3)
    );

    geometry.setAttribute(
      "aScale",
      new THREE.Float32BufferAttribute(scalesArray, 1)
    );

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: this.size },
        uResolution: { value: this.sizes.resolution },
        uColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        uProgress: new THREE.Uniform(0),
      },
      vertexShader: `
        uniform float uSize;
        uniform vec2 uResolution;
        uniform float uProgress;

        attribute float aScale;

        float remap(float value, float originMin, float originMax, float destinationMin, float destinationMax)
{
    return clamp(destinationMin + (value - originMin) * (destinationMax - destinationMin) / (originMax - originMin), destinationMin, destinationMax);
}

        void main() {
            vec3 newPosition = position;

            // Exploding
    float explodingProgress = uProgress;
//  explodingProgress = 1.0 - pow(1.0 - explodingProgress, 3.0);
    newPosition *= explodingProgress;

    // Falling
    float fallingProgress = uProgress;
    // fallingProgress = 1.0 - pow(1.0 - fallingProgress, 3.0);
    newPosition.y -= fallingProgress * 1.0;

    // Scaling
    float scaleProgress = 1.0 - uProgress;
   
            
              vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

     gl_PointSize = uSize * uResolution.y * aScale * scaleProgress;
       gl_PointSize *= 1.0 / - viewPosition.z;
        }
        `,
      fragmentShader: `
        uniform vec3 uColor;

        void main() {
          float circle = step(0.5, distance(gl_PointCoord, vec2(0.5)) + 0.25);
    circle = 1.0 - circle;

    vec3 color = uColor;    
    color *= circle;    

    // Final color
    gl_FragColor = vec4(color, circle);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
        }
        `,
      transparent: true,
      depthWrite: false,
    });

    const projectileParticles = new THREE.Points(geometry, material);
    projectileParticles.position.copy(position);
    this.scene.add(projectileParticles);

    // Destroy
    const destroy = () => {
      this.scene.remove(projectileParticles);
      geometry.dispose();
      material.dispose();
    };

    // Animate
    gsap.to(material.uniforms.uProgress, {
      value: 1,
      duration: 1,
      ease: "power2.outq",
      onComplete: destroy,
    });
  }
}
