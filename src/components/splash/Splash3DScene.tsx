import { Component, ReactNode, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";

const supportsWebGL = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    const context = (
      canvas.getContext("webgl2", options) ||
      canvas.getContext("webgl", options) ||
      canvas.getContext("experimental-webgl", options as WebGLContextAttributes)
    ) as WebGLRenderingContext | WebGL2RenderingContext | null;

    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
};

const StaticGoldFallback = () => (
  <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
    <div className="h-72 w-72 rounded-full bg-[radial-gradient(circle_at_32%_24%,hsl(48_100%_96%),hsl(45_88%_65%)_30%,hsl(40_75%_48%)_68%,transparent_72%)] opacity-80 blur-[1px] shadow-[0_0_90px_hsl(43_90%_54%/0.5)]" />
    <div className="absolute h-[26rem] w-[26rem] rounded-full border border-primary/20" />
    <div className="absolute h-[34rem] w-[34rem] rounded-full border border-primary/10" />
  </div>
);

class WebGLErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D splash disabled because WebGL could not start:", error);
  }

  render() {
    if (this.state.failed) return <StaticGoldFallback />;
    return this.props.children;
  }
}

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
  const [webGLReady, setWebGLReady] = useState(false);

  useEffect(() => {
    setWebGLReady(supportsWebGL());
  }, []);

  if (!webGLReady) return <StaticGoldFallback />;

  return (
    <WebGLErrorBoundary>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 4.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
        fallback={<StaticGoldFallback />}
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
    </WebGLErrorBoundary>
  );
};

export default Splash3DScene;
