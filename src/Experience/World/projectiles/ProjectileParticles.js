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

    this.count = 15;
    this.size = 1;
    this.radius = 2;
  }

  createProjectileParticles(position) {
    position.y += 1.2;
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
        uColor1: { value: new THREE.Color("#ffffff") },
        uColor2: { value: new THREE.Color("#ffffff  ") },
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
    newPosition *= explodingProgress;

    // Falling
    float fallingProgress = uProgress;
    newPosition.y -= fallingProgress * 3.0;
      
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
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        void main() {
          float circle = step(0.5, distance(gl_PointCoord, vec2(0.5)) + 0.25);
    circle = 1.0 - circle;

    vec3 color1 = uColor1;    
    vec3 color2 = uColor2;    
    
      vec3 color = mix(color1, color2, gl_PointCoord.y);
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
      ease: "power2.out",
      onComplete: destroy,
    });
  }
}
