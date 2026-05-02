import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";

/**
 * GoldOrb — a floating, slowly-distorting gold sphere with rim glow.
 * Lives behind the OverraPrep logo on the splash screen.
 */
const GoldOrb = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.9}>
      <mesh ref={meshRef} scale={1.35}>
        <sphereGeometry args={[1, 96, 96]} />
        <MeshDistortMaterial
          color="#f5c042"
          emissive="#f0a90f"
          emissiveIntensity={0.55}
          roughness={0.18}
          metalness={0.92}
          distort={0.32}
          speed={1.6}
        />
      </mesh>
    </Float>
  );
};

/** Soft inner glow ring around the orb */
const GlowRing = () => {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.15;
  });
  return (
    <mesh ref={ringRef} position={[0, 0, -0.8]}>
      <ringGeometry args={[1.7, 1.95, 64]} />
      <meshBasicMaterial color="#fff5d8" transparent opacity={0.18} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Splash3DScene = () => {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      {/* Lighting tuned for warm gold */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#fffaf0" />
      <pointLight position={[-3, -2, 3]} intensity={1.2} color="#ffd166" />
      <pointLight position={[0, 0, 2.5]} intensity={0.9} color="#fff1c2" />

      <GlowRing />
      <GoldOrb />

      {/* Floating gold dust particles */}
      <Sparkles
        count={70}
        scale={[6, 6, 4]}
        size={4}
        speed={0.45}
        color="#fff2c7"
        opacity={0.9}
      />
      <Sparkles
        count={30}
        scale={[8, 5, 3]}
        size={2}
        speed={0.3}
        color="#fffae0"
        opacity={0.7}
      />

      {/* Subtle environment reflections */}
      <Environment preset="sunset" background={false} />
    </Canvas>
  );
};

export default Splash3DScene;
