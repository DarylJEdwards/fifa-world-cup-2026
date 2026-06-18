import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import type { GroupCode, GroupStanding } from "../types";
import StageContent from "./StageContent";

export default function CinematicStage({
  groups,
  selectedGroup,
  onSelectGroup,
  motionOff
}: {
  groups: GroupStanding[];
  selectedGroup: GroupCode;
  onSelectGroup: (group: GroupCode) => void;
  motionOff: boolean;
}) {
  return (
    <section className="stage">
      <div className="three-layer" aria-hidden="true">
        <Canvas camera={{ position: [0, 4.2, 8], fov: 45 }}>
          <ambientLight intensity={1.2} />
          <pointLight position={[0, 5, 2]} intensity={35} color="#f4bf53" />
          <pointLight position={[-5, 3, 3]} intensity={8} color="#2fbf78" />
          <TrophyScene paused={motionOff} />
        </Canvas>
      </div>
      <StageContent groups={groups} selectedGroup={selectedGroup} onSelectGroup={onSelectGroup} motionOff={motionOff} />
    </section>
  );
}

function TrophyScene({ paused }: { paused: boolean }) {
  const globe = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (paused) return;
    if (globe.current) globe.current.rotation.y += delta * 0.45;
    if (ring.current) ring.current.rotation.z += delta * 0.28;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <circleGeometry args={[4.8, 96]} />
        <meshStandardMaterial color="#173d22" metalness={0.2} roughness={0.42} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.12, 0]}>
        <ringGeometry args={[2.6, 4.9, 128]} />
        <meshStandardMaterial color="#d6a84f" emissive="#8c5e14" emissiveIntensity={0.45} metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh ref={ring} position={[0, 0.2, 0]} rotation={[1.25, 0.2, 0]}>
        <torusGeometry args={[1.35, 0.018, 16, 128]} />
        <meshStandardMaterial color="#f7d37a" emissive="#f0b73d" emissiveIntensity={0.9} />
      </mesh>
      <mesh ref={globe} position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.82, 48, 48]} />
        <meshStandardMaterial color="#d6a84f" emissive="#8a5b12" emissiveIntensity={0.75} metalness={0.9} roughness={0.18} wireframe />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.46, 2.2, 32]} />
        <meshStandardMaterial color="#f5c85b" emissive="#b87918" emissiveIntensity={0.6} metalness={0.95} roughness={0.2} />
      </mesh>
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 0.35, 48]} />
        <meshStandardMaterial color="#090d10" metalness={0.6} roughness={0.2} />
      </mesh>
    </group>
  );
}
