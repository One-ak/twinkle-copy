"use client";

import { useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { universe } from "@/data/universe";

// L-System Rules
const axiom = "X";
const rules: Record<string, string> = {
  X: "F+[[X]-X]-F[-FX]+X",
  F: "FF"
};

function generateLSystem(iterations: number) {
  let result = axiom;
  for (let i = 0; i < iterations; i++) {
    let nextResult = "";
    for (let char of result) {
      nextResult += rules[char] || char;
    }
    result = nextResult;
  }
  return result;
}

function LSystemTree({ growthFactor }: { growthFactor: number }) {
  const branchCount = useRef(0);
  const leafCount = useRef(0);
  const branchMesh = useRef<THREE.InstancedMesh>(null);
  const leafMesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);

  const iterations = Math.floor(growthFactor * 5); // 0 to 5 iterations
  const treeString = useMemo(() => generateLSystem(iterations), [iterations]);

  useEffect(() => {
    if (!branchMesh.current || !leafMesh.current) return;

    let pos = new THREE.Vector3(0, 0, 0);
    let dir = new THREE.Vector3(0, 1, 0);
    let length = 0.5;
    const angle = Math.PI / 8; // 22.5 degrees
    let stack: { pos: THREE.Vector3; dir: THREE.Vector3 }[] = [];

    const dummy = new THREE.Object3D();
    let bIndex = 0;
    let lIndex = 0;

    for (let i = 0; i < treeString.length; i++) {
      const char = treeString[i];
      if (char === "F") {
        const nextPos = pos.clone().add(dir.clone().multiplyScalar(length));
        
        // Setup branch instance
        const midPoint = pos.clone().add(nextPos).multiplyScalar(0.5);
        dummy.position.copy(midPoint);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        dummy.quaternion.copy(quaternion);
        dummy.scale.set(1, length, 1);
        dummy.updateMatrix();
        branchMesh.current.setMatrixAt(bIndex++, dummy.matrix);

        // Add a leaf at the end of some branches
        if (Math.random() > 0.6) {
          dummy.position.copy(nextPos);
          dummy.scale.set(0.3, 0.3, 0.3);
          dummy.updateMatrix();
          leafMesh.current.setMatrixAt(lIndex++, dummy.matrix);
        }

        pos = nextPos;
      } else if (char === "+") {
        dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle * Math.random());
      } else if (char === "-") {
        dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), -angle);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle * Math.random());
      } else if (char === "[") {
        stack.push({ pos: pos.clone(), dir: dir.clone() });
      } else if (char === "]") {
        const state = stack.pop();
        if (state) {
          pos = state.pos;
          dir = state.dir;
        }
      }
    }

    branchCount.current = bIndex;
    leafCount.current = lIndex;
    branchMesh.current.count = bIndex;
    leafMesh.current.count = lIndex;
    branchMesh.current.instanceMatrix.needsUpdate = true;
    leafMesh.current.instanceMatrix.needsUpdate = true;
  }, [treeString]);

  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#cdb9ff",
    roughness: 0.6,
    metalness: 0.2
  }), []);

  // Emissive glowing material for leaves
  const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#f2a8d1",
    emissive: "#f2a8d1",
    emissiveIntensity: 2.5, // High intensity for bloom
    roughness: 0.1,
    toneMapped: false // Crucial for bloom to exceed 1.0
  }), []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
    }
  });

  // Calculate smooth visual scale based on growth factor percentage
  const visualScale = 0.5 + growthFactor * 0.5;

  return (
    <group ref={group} scale={[visualScale, visualScale, visualScale]} position={[0, -4, 0]}>
      <instancedMesh ref={branchMesh} args={[undefined, trunkMaterial, 2000]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.06, 1, 6]} />
      </instancedMesh>
      <instancedMesh ref={leafMesh} args={[undefined, leafMaterial, 1000]}>
        <icosahedronGeometry args={[1, 1]} />
      </instancedMesh>
    </group>
  );
}

export function GrowingPlant() {
  const startedAt = new Date(universe.relationshipStartedAt).getTime();
  const now = Date.now();
  const fullGrowthTime = 365 * 24 * 60 * 60 * 1000;
  const elapsed = Math.max(0, now - startedAt);
  // Cap growth factor at 1 (full growth)
  const growthFactor = Math.min(elapsed / fullGrowthTime, 1.0);

  return (
    <div className="w-full h-full relative" style={{ height: "70vh", minHeight: "500px" }}>
      <Canvas camera={{ position: [0, 2, 12], fov: 45 }}>
        <color attach="background" args={["#0a0510"]} />
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <Environment preset="night" />
        
        <LSystemTree growthFactor={growthFactor} />
        
        <Sparkles count={200} scale={12} size={6} speed={0.2} color="#f2a8d1" opacity={0.8} />
        <Sparkles count={100} scale={10} size={8} speed={0.5} color="#cdb9ff" opacity={0.5} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} maxPolarAngle={Math.PI / 2} />

        <EffectComposer>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
