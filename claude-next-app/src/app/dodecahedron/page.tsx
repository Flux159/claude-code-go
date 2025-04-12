"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, usePlane, useSphere } from "@react-three/cannon";
import * as THREE from "three";
import Link from "next/link";

// Random color generator for the balls
const getRandomColor = () => {
  return new THREE.Color(
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5,
  );
};

// Rotating dodecahedron component
function Dodecahedron(props: any) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (mesh.current) {
      const t = clock.getElapsedTime();
      mesh.current.rotation.x = Math.sin(t * 0.3) * 0.2;
      mesh.current.rotation.y = Math.sin(t * 0.2) * 0.5;
      mesh.current.rotation.z = Math.sin(t * 0.1) * 0.1;
    }
  });

  return (
    <mesh {...props} ref={mesh} scale={1}>
      <dodecahedronGeometry args={[5, 0]} />
      <meshStandardMaterial
        color="#6366f1"
        transparent={true}
        opacity={0.3}
        side={THREE.DoubleSide}
        wireframe={true}
      />
    </mesh>
  );
}

// Create a physical boundary using boxes arranged in a dodecahedron shape
function DodecahedronBoundary() {
  // Calculate positions for the dodecahedron faces
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
  const b = 1 / phi;

  // Dodecahedron vertices (normalized to fit our scale)
  const scale = 4;
  const vertices = [
    // (±1, ±1, ±1)
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
    // (0, ±1/φ, ±φ)
    [0, b, phi],
    [0, b, -phi],
    [0, -b, phi],
    [0, -b, -phi],
    // (±1/φ, ±φ, 0)
    [b, phi, 0],
    [b, -phi, 0],
    [-b, phi, 0],
    [-b, -phi, 0],
    // (±φ, 0, ±1/φ)
    [phi, 0, b],
    [phi, 0, -b],
    [-phi, 0, b],
    [-phi, 0, -b],
  ].map((v) => v.map((coord) => coord * scale));

  // Create basic faces 
  const faces = [
    [0, 8, 4, 14, 12],
    [0, 12, 16, 17, 2],
    [1, 9, 5, 15, 13],
    [1, 13, 17, 16, 3],
    [2, 17, 13, 14, 10],
    [3, 16, 12, 15, 11],
    [4, 8, 10, 18, 19],
    [5, 9, 11, 19, 18],
    [6, 7, 19, 18, 14],
    [4, 19, 7, 6, 5],
    [6, 18, 10, 2, 3],
    [0, 2, 10, 8, 4],    // Complete faces for proper physics
  ];

  return (
    <>
      {faces.map((face, i) => {
        // Calculate center of each face
        const center = [0, 0, 0];
        face.forEach((vIdx) => {
          center[0] += vertices[vIdx][0] / face.length;
          center[1] += vertices[vIdx][1] / face.length;
          center[2] += vertices[vIdx][2] / face.length;
        });

        // Calculate normal of each face (pointing outward)
        const normal = new THREE.Vector3(
          center[0],
          center[1],
          center[2],
        ).normalize();

        return <BoundaryPlane key={i} position={center} normal={normal} />;
      })}
    </>
  );
}

function BoundaryPlane({ position, normal }: { position: number[], normal: THREE.Vector3 }) {
  usePlane(() => ({
    position,
    type: "Static",
    rotation: [0, 0, 0],
    normal: [normal.x, normal.y, normal.z],
  }));

  return null; // Invisible collision plane
}

// Ball component with physics
function Ball({ position, color }: { position: number[], color: THREE.Color }) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: [0.5],
    linearDamping: 0.05,
    restitution: 0.9, // Higher bounciness
  }));

  // Random initial velocity
  useEffect(() => {
    // Set initial velocity
    api.velocity.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );

    // Apply small random forces periodically to keep balls moving
    const interval = setInterval(() => {
      api.applyForce(
        [
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
        ],
        [0, 0, 0]
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 12, 12]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

// Generate 12 balls with random positions and colors
function Balls() {
  // Memoize positions and colors to prevent re-randomization on renders
  const ballData = useMemo(() => {
    return Array(12).fill(null).map(() => ({
      position: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
      ] as [number, number, number],
      color: getRandomColor()
    }));
  }, []);

  return (
    <>
      {ballData.map((data, i) => (
        <Ball
          key={i}
          position={data.position}
          color={data.color}
        />
      ))}
    </>
  );
}

export default function DodecahedronPage() {
  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Physics
          gravity={[0, -5, 0]}
          iterations={20}
          size={10}
          allowSleep={true}
          defaultContactMaterial={{ restitution: 0.9, friction: 0.1 }}
        >
          <Dodecahedron position={[0, 0, 0]} />
          <DodecahedronBoundary />
          <Balls />
        </Physics>
        <OrbitControls enableZoom={true} enablePan={true} />
      </Canvas>

      <div className="absolute top-4 left-4 text-white">
        <h1 className="mb-2 text-2xl font-bold">3D Dodecahedron Physics</h1>
        <p>A twelve-sided polyhedron with a dozen bouncy balls affected by gravity</p>
        <p className="mt-2 text-xs">Drag to rotate the camera view</p>
      </div>

      <div className="absolute bottom-4 left-4">
        <Link
          href="/"
          className="inline-block rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}