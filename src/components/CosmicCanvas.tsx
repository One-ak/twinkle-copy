"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";

type IntroState = "orbiting" | "atStar" | "bursting" | "entered";

type CosmicCanvasProps = {
  entered?: boolean;
  introState?: IntroState;
  onStarReached?: () => void;
  onBurstComplete?: () => void;
  intensity: number;
};

const MOON_CENTER = new THREE.Vector3(0.9, -0.05, -26);
const STAR_POSITION = new THREE.Vector3(0.1, 0.72, -118);
const MOON_APPROACH_SECONDS = 5.4;
const MOON_ORBIT_SECONDS = 12.8;
const MOON_UTURN_SECONDS = 7.4;
const STAR_TRAVEL_SECONDS = 9.8;
const STAR_REACH_SECONDS = MOON_APPROACH_SECONDS + MOON_ORBIT_SECONDS + MOON_UTURN_SECONDS + STAR_TRAVEL_SECONDS;
const ORBIT_START_THETA = 1.46;
const ORBIT_END_THETA = -0.72;
const UTURN_END_THETA = -2.55;
const STAR_HOLD_POSITION = new THREE.Vector3(-0.12, 0.2, -110.7);

function smootherStep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function getOrbitPosition(progress: number) {
  const eased = smootherStep(progress);
  const theta = THREE.MathUtils.lerp(ORBIT_START_THETA, ORBIT_END_THETA, eased);
  const radiusX = THREE.MathUtils.lerp(6.7, 10.2, eased);
  const radiusZ = THREE.MathUtils.lerp(7.0, 12.4, eased);

  return new THREE.Vector3(
    MOON_CENTER.x + Math.cos(theta) * radiusX,
    MOON_CENTER.y + 0.28 + Math.sin(eased * Math.PI) * 1.35,
    MOON_CENTER.z + Math.sin(theta) * radiusZ
  );
}

function getMoonApproachPosition(progress: number) {
  const eased = smootherStep(progress);
  const start = MOON_CENTER.clone().add(new THREE.Vector3(-1.55, 0.62, 18.8));
  const control = MOON_CENTER.clone().add(new THREE.Vector3(-2.55, 0.42, 10.4));
  const end = getOrbitPosition(0);
  const firstLeg = start.lerp(control, eased);
  const secondLeg = control.lerp(end, eased);
  return firstLeg.lerp(secondLeg, eased);
}

function getUTurnPosition(progress: number) {
  const eased = smootherStep(progress);
  const theta = THREE.MathUtils.lerp(ORBIT_END_THETA, UTURN_END_THETA, eased);
  const radiusX = THREE.MathUtils.lerp(10.2, 18.4, eased);
  const radiusZ = THREE.MathUtils.lerp(12.4, 24.8, eased);

  return new THREE.Vector3(
    MOON_CENTER.x + Math.cos(theta) * radiusX,
    MOON_CENTER.y + 0.92 + Math.sin(eased * Math.PI) * 0.82,
    MOON_CENTER.z + Math.sin(theta) * radiusZ
  );
}

function getStarTravelPosition(progress: number) {
  const eased = smootherStep(progress);
  const start = getUTurnPosition(1);
  const control = start.clone().add(new THREE.Vector3(-4.4, 1.15, -22));
  const end = STAR_HOLD_POSITION;
  const firstLeg = start.lerp(control, eased);
  const secondLeg = control.lerp(end, eased);
  return firstLeg.lerp(secondLeg, eased);
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvasTexture(size: number, paint: (context: CanvasRenderingContext2D, size: number) => void) {
  if (typeof document === "undefined") {
    const data = new Uint8Array([245, 243, 247, 255]);
    const texture = new THREE.DataTexture(data, 1, 1);
    texture.needsUpdate = true;
    return texture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    const data = new Uint8Array([245, 243, 247, 255]);
    const texture = new THREE.DataTexture(data, 1, 1);
    texture.needsUpdate = true;
    return texture;
  }

  paint(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

function createMoonTexture() {
  return makeCanvasTexture(1024, (context, size) => {
    const random = seededRandom(9);
    const gradient = context.createRadialGradient(size * 0.38, size * 0.28, 0, size * 0.52, size * 0.55, size * 0.74);
    gradient.addColorStop(0, "#fffefe");
    gradient.addColorStop(0.34, "#edeaf2");
    gradient.addColorStop(0.72, "#b8b5c1");
    gradient.addColorStop(1, "#8a8794");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    context.globalCompositeOperation = "multiply";
    for (let index = 0; index < 460; index += 1) {
      const x = random() * size;
      const y = random() * size;
      const radius = size * (0.003 + random() * random() * 0.03);
      const alpha = 0.055 + random() * 0.13;
      const crater = context.createRadialGradient(x, y, 0, x, y, radius);
      crater.addColorStop(0, `rgba(82,80,92,${alpha})`);
      crater.addColorStop(0.56, `rgba(134,132,145,${alpha * 0.45})`);
      crater.addColorStop(0.78, "rgba(250,250,255,0.08)");
      crater.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = crater;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 160; index += 1) {
      const x = random() * size;
      const y = random() * size;
      const radius = size * (0.002 + random() * 0.018);
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, "rgba(255,255,255,0.22)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalCompositeOperation = "source-over";
    context.fillStyle = "rgba(214,207,232,0.14)";
    for (let index = 0; index < 36; index += 1) {
      const y = random() * size;
      context.fillRect(0, y, size, 1 + random() * 2);
    }
  });
}

function createGlowTexture() {
  return makeCanvasTexture(256, (context, size) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.16, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.36, "rgba(232,224,255,0.38)");
    gradient.addColorStop(0.68, "rgba(184,156,255,0.12)");
    gradient.addColorStop(1, "rgba(184,156,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

function StarField({ intensity, entered }: { intensity: number; entered: boolean }) {
  const farRef = useRef<THREE.Points>(null);
  const nearRef = useRef<THREE.Points>(null);

  const { farGeometry, nearGeometry } = useMemo(() => {
    const random = seededRandom(24);
    const makeGeometry = (count: number, radiusMin: number, radiusMax: number, depthOffset: number) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let index = 0; index < count; index += 1) {
        const radius = radiusMin + random() * (radiusMax - radiusMin);
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);
        positions[index * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[index * 3 + 1] = Math.cos(phi) * radius * 0.62;
        positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius - depthOffset;

        const silver = 0.78 + random() * 0.22;
        const lavender = random() < 0.08 ? 0.04 + random() * 0.06 : 0;
        colors[index * 3] = silver;
        colors[index * 3 + 1] = silver;
        colors[index * 3 + 2] = Math.min(1, silver + lavender);
      }

      const buffer = new THREE.BufferGeometry();
      buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return buffer;
    };

    return {
      farGeometry: makeGeometry(2600, 42, 150, 42),
      nearGeometry: makeGeometry(520, 18, 72, 28)
    };
  }, []);

  const farMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  const nearMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.075,
        vertexColors: true,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (farRef.current) {
      farRef.current.rotation.y = elapsed * 0.0035;
      farRef.current.rotation.x = Math.sin(elapsed * 0.06) * 0.006;
      farMaterial.opacity = (entered ? 0.42 : 0.7) + intensity * 0.12;
      farMaterial.size = 0.04 + intensity * 0.018 + Math.sin(elapsed * 0.44) * 0.004;
    }
    if (nearRef.current) {
      nearRef.current.rotation.y = -elapsed * 0.006;
      nearRef.current.position.z = Math.sin(elapsed * 0.08) * 2;
      nearMaterial.opacity = (entered ? 0.28 : 0.52) + intensity * 0.16;
      nearMaterial.size = 0.062 + intensity * 0.035 + Math.sin(elapsed * 0.7) * 0.007;
    }
  });

  return (
    <>
      <points ref={farRef} geometry={farGeometry} material={farMaterial} />
      <points ref={nearRef} geometry={nearGeometry} material={nearMaterial} />
    </>
  );
}

function CinematicMoon({ introState }: { introState: IntroState }) {
  const moonRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => createMoonTexture(), []);
  const lightDirection = useMemo(() => new THREE.Vector3(0.92, 0.2, -0.36), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          moonTexture: { value: texture },
          lightDirection: { value: lightDirection },
          introProgress: { value: 0 },
          opacity: { value: 1 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vViewNormal;

          void main() {
            vUv = uv;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vViewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D moonTexture;
          uniform vec3 lightDirection;
          uniform float introProgress;
          uniform float opacity;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vViewNormal;

          void main() {
            vec3 normal = normalize(vWorldNormal);
            vec3 viewNormal = normalize(vViewNormal);
            vec3 light = normalize(lightDirection);
            float rawLight = dot(normal, light);
            float lit = smoothstep(-0.12, 0.58, rawLight);
            float terminator = smoothstep(-0.2, 0.08, rawLight) * (1.0 - smoothstep(0.34, 0.78, rawLight));
            float rim = pow(1.0 - abs(normal.z), 2.4) * smoothstep(-0.62, 0.16, rawLight);
            float viewRim = pow(1.0 - abs(viewNormal.z), 3.4);
            vec3 textureColor = texture2D(moonTexture, vUv).rgb;
            vec3 shadow = vec3(0.011, 0.01, 0.021) + textureColor * 0.035 + vec3(0.03, 0.02, 0.055) * (1.0 - lit);
            vec3 silver = mix(vec3(0.68, 0.68, 0.72), vec3(1.0, 0.985, 0.94), textureColor.r);
            vec3 litColor = silver * (0.72 + textureColor.r * 0.5);
            vec3 color = mix(shadow, litColor, lit);
            color += rim * vec3(0.86, 0.92, 1.0) * (1.25 - introProgress * 0.22);
            color += viewRim * vec3(0.9, 0.94, 1.0) * (0.58 - introProgress * 0.18);
            color += terminator * vec3(0.46, 0.36, 0.7) * 0.075;
            gl_FragColor = vec4(color, opacity);
          }
        `,
        transparent: true
      }),
    [lightDirection, texture]
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: "#f8f7ff",
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const orbitProgress = smootherStep(
      (elapsed - MOON_APPROACH_SECONDS * 0.28) / (MOON_APPROACH_SECONDS + MOON_ORBIT_SECONDS)
    );
    const lightX = THREE.MathUtils.lerp(-0.72, 0.28, orbitProgress);
    const lightY = THREE.MathUtils.lerp(0.14, 0.18, orbitProgress);
    const lightZ = THREE.MathUtils.lerp(-0.68, -0.94, orbitProgress);
    lightDirection.set(lightX, lightY, lightZ).normalize();

    material.uniforms.introProgress.value = orbitProgress;
    material.uniforms.opacity.value = introState === "entered" ? 0 : 1;

    if (moonRef.current) {
      moonRef.current.rotation.y = elapsed * 0.028;
      moonRef.current.rotation.x = -0.14 + Math.sin(elapsed * 0.08) * 0.018;
    }

    if (haloRef.current) {
      const breathe = 1 + Math.sin(elapsed * 0.52) * 0.025;
      haloRef.current.scale.setScalar((10.5 + orbitProgress * 1.8) * breathe);
      glowMaterial.opacity = 0.08 + orbitProgress * 0.18;
    }
  });

  return (
    <group position={MOON_CENTER}>
      <sprite ref={haloRef} material={glowMaterial} />
      <mesh ref={moonRef} material={material}>
        <sphereGeometry args={[4.75, 128, 128]} />
      </mesh>
    </group>
  );
}

function HeartbeatStar({
  introState,
  onBurstComplete
}: {
  introState: IntroState;
  onBurstComplete?: () => void;
}) {
  const coreRef = useRef<THREE.Sprite>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const auraRef = useRef<THREE.Sprite>(null);
  const burstStarted = useRef<number | null>(null);
  const completed = useRef(false);

  const coreMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: "#fffefa",
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: "#ffffff",
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  const auraMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: "#d8c6ff",
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const starRevealProgress = smootherStep(
      (elapsed - MOON_APPROACH_SECONDS - MOON_ORBIT_SECONDS - MOON_UTURN_SECONDS * 0.34) /
        (MOON_UTURN_SECONDS * 0.66 + STAR_TRAVEL_SECONDS)
    );
    const isApproaching = introState === "orbiting";
    const isActive = introState === "atStar";
    const isBursting = introState === "bursting";
    const baseOpacity = isApproaching ? starRevealProgress : 1;

    if (isBursting && burstStarted.current === null) {
      burstStarted.current = elapsed;
      completed.current = false;
    }

    let burstProgress = 0;
    if (isBursting && burstStarted.current !== null) {
      burstProgress = Math.min(1, (elapsed - burstStarted.current) / 2.45);
    } else if (!isBursting) {
      burstStarted.current = null;
    }

    const heartbeat = isActive
      ? 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 1.18)
      : 0.38 + 0.12 * Math.sin(elapsed * 0.9);
    const pulse = 1 + heartbeat * (isActive ? 0.18 : 0.05);
    const burstScale = isBursting ? 1 + burstProgress * 58 : 1;
    const fade = isBursting ? Math.max(0, 1 - burstProgress * 0.82) : baseOpacity;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.72 * pulse * burstScale);
      coreMaterial.opacity = fade * (0.96 + heartbeat * 0.04);
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar((4.2 + heartbeat * 1.15) * (isBursting ? 1 + burstProgress * 20 : 1));
      glowMaterial.opacity = fade * (isActive ? 0.4 + heartbeat * 0.22 : 0.08 + starRevealProgress * 0.32);
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar((8.6 + heartbeat * 2.2) * (isBursting ? 1 + burstProgress * 16 : 1));
      auraMaterial.opacity = fade * (isActive ? 0.16 + heartbeat * 0.16 : 0.02 + starRevealProgress * 0.16);
    }

    if (burstProgress >= 1 && onBurstComplete && !completed.current) {
      completed.current = true;
      onBurstComplete();
    }
  });

  return (
    <group position={STAR_POSITION}>
      <sprite ref={auraRef} material={auraMaterial} />
      <sprite ref={glowRef} material={glowMaterial} />
      <sprite ref={coreRef} material={coreMaterial} />
    </group>
  );
}

function StarBurstParticles({ introState }: { introState: IntroState }) {
  const pointsRef = useRef<THREE.Points>(null);
  const startedAt = useRef<number | null>(null);

  const geometry = useMemo(() => {
    const random = seededRandom(58);
    const count = 620;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const theta = random() * Math.PI * 2;
      const radius = 0.2 + random() * random() * 1.4;
      const y = (random() - 0.5) * 0.75;
      positions[index * 3] = Math.cos(theta) * radius;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = Math.sin(theta) * radius;

      const silver = 0.84 + random() * 0.16;
      colors[index * 3] = silver;
      colors[index * 3 + 1] = silver;
      colors[index * 3 + 2] = Math.min(1, silver + random() * 0.08);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return buffer;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  useFrame((state) => {
    if (introState === "bursting" && startedAt.current === null) {
      startedAt.current = state.clock.getElapsedTime();
    }
    if (introState !== "bursting") {
      startedAt.current = null;
      material.opacity = 0;
      if (pointsRef.current) pointsRef.current.scale.setScalar(0.1);
      return;
    }

    const progress = Math.min(1, (state.clock.getElapsedTime() - (startedAt.current ?? 0)) / 2.2);
    const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
    if (pointsRef.current) {
      pointsRef.current.scale.setScalar(0.4 + eased * 20);
      pointsRef.current.rotation.z = eased * 0.7;
    }
    material.opacity = Math.sin(progress * Math.PI) * 0.8;
    material.size = 0.065 + eased * 0.08;
  });

  return <points ref={pointsRef} position={STAR_POSITION} geometry={geometry} material={material} />;
}

function CinematicCamera({
  introState,
  onStarReached
}: {
  introState: IntroState;
  onStarReached?: () => void;
}) {
  const reached = useRef(false);
  const burstStartedAt = useRef<number | null>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    const camera = state.camera;

    if (introState === "orbiting") {
      if (elapsed < MOON_APPROACH_SECONDS) {
        const progress = elapsed / MOON_APPROACH_SECONDS;
        const position = getMoonApproachPosition(progress);
        const target = MOON_CENTER.clone().add(
          new THREE.Vector3(
            THREE.MathUtils.lerp(-0.62, -0.96, smootherStep(progress)),
            0.12,
            THREE.MathUtils.lerp(0.14, 0.24, smootherStep(progress))
          )
        );

        camera.position.copy(position);
        camera.lookAt(target);
      } else if (elapsed < MOON_APPROACH_SECONDS + MOON_ORBIT_SECONDS) {
        const progress = (elapsed - MOON_APPROACH_SECONDS) / MOON_ORBIT_SECONDS;
        const position = getOrbitPosition(progress);
        const target = MOON_CENTER.clone().add(
          new THREE.Vector3(
            THREE.MathUtils.lerp(-1.05, 0.42, smootherStep(progress)),
            THREE.MathUtils.lerp(0.12, 0.3, smootherStep(progress)),
            THREE.MathUtils.lerp(0.2, -0.72, smootherStep(progress))
          )
        );

        camera.position.copy(position);
        camera.lookAt(target);
      } else if (elapsed < MOON_APPROACH_SECONDS + MOON_ORBIT_SECONDS + MOON_UTURN_SECONDS) {
        const progress = (elapsed - MOON_APPROACH_SECONDS - MOON_ORBIT_SECONDS) / MOON_UTURN_SECONDS;
        const eased = smootherStep(progress);
        const position = getUTurnPosition(progress);
        const moonTarget = MOON_CENTER.clone().add(new THREE.Vector3(0.26, 0.24, -0.34));
        const starTarget = STAR_POSITION.clone().add(new THREE.Vector3(0, 0, -1.6));
        const target = moonTarget.lerp(starTarget, smootherStep((eased - 0.12) / 0.88));

        camera.position.copy(position);
        camera.lookAt(target);
      } else {
        const travelProgress = Math.min(
          1,
          (elapsed - MOON_APPROACH_SECONDS - MOON_ORBIT_SECONDS - MOON_UTURN_SECONDS) / STAR_TRAVEL_SECONDS
        );
        const position = getStarTravelPosition(travelProgress);
        position.x += Math.sin(elapsed * 0.28) * 0.12 * (1 - smootherStep(travelProgress));
        position.y += Math.sin(elapsed * 0.19) * 0.1 * (1 - smootherStep(travelProgress));

        camera.position.copy(position);
        camera.lookAt(STAR_POSITION);

        if (travelProgress >= 1 && !reached.current) {
          reached.current = true;
          onStarReached?.();
        }
      }

      if (elapsed >= STAR_REACH_SECONDS && !reached.current) {
        reached.current = true;
        onStarReached?.();
      }
    } else if (introState === "atStar") {
      camera.position.x = STAR_HOLD_POSITION.x + Math.sin(elapsed * 0.15) * 0.06;
      camera.position.y = STAR_HOLD_POSITION.y + Math.cos(elapsed * 0.12) * 0.045;
      camera.position.z = STAR_HOLD_POSITION.z + Math.sin(elapsed * 0.09) * 0.075;
      camera.lookAt(STAR_POSITION);
    } else if (introState === "bursting") {
      if (burstStartedAt.current === null) burstStartedAt.current = elapsed;
      const progress = Math.min(1, (elapsed - burstStartedAt.current) / 2.45);
      const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, STAR_POSITION.x, 0.055);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, STAR_POSITION.y, 0.055);
      camera.position.z = THREE.MathUtils.lerp(STAR_HOLD_POSITION.z, STAR_POSITION.z - 3.2, eased);
      camera.lookAt(STAR_POSITION.x, STAR_POSITION.y, STAR_POSITION.z - 2.5);
    } else if (introState === "entered") {
      burstStartedAt.current = null;
      const drift = state.clock.getElapsedTime();
      camera.position.x = Math.sin(drift * 0.08) * 0.32;
      camera.position.y = Math.cos(drift * 0.07) * 0.18;
      camera.position.z = 0;
      camera.lookAt(0, 0, -108);
    }
  });

  return null;
}

function Nebula({ entered, intensity }: { entered: boolean; intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#8870d6"),
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.z = elapsed * 0.014;
      meshRef.current.scale.setScalar((entered ? 1.45 : 1.08) + intensity * 0.1);
      material.opacity = (entered ? 0.08 : 0.04) + intensity * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} material={material}>
      <torusKnotGeometry args={[4.4, 0.045, 180, 10, 2, 5]} />
    </mesh>
  );
}

export const CosmicCanvas = memo(function CosmicCanvas({
  entered = false,
  introState = "entered",
  onStarReached,
  onBurstComplete,
  intensity
}: CosmicCanvasProps) {
  const actualState = entered ? "entered" : introState;

  return (
    <div className="cosmic-canvas" aria-hidden>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 4.4], fov: 58 }} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#020007"]} />
        <fog attach="fog" args={["#020007", 18, 172]} />
        <ambientLight intensity={0.025} />
        <directionalLight position={[8, 4, 2]} intensity={0.45} color="#fffdf4" />

        <StarField intensity={intensity} entered={actualState === "entered"} />

        {actualState !== "entered" ? (
          <>
            <CinematicMoon introState={actualState} />
            <HeartbeatStar introState={actualState} onBurstComplete={onBurstComplete} />
            <StarBurstParticles introState={actualState} />
          </>
        ) : (
          <group position={[0, 0, -115]}>
            <Nebula entered intensity={intensity} />
          </group>
        )}

        <CinematicCamera introState={actualState} onStarReached={onStarReached} />
      </Canvas>
    </div>
  );
});
