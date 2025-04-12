"use client";

import { useRef, useEffect } from "react";
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
function Dodecahedron(props) {
  const mesh = useRef();

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.002;
      mesh.current.rotation.y += 0.003;
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

  // Create faces (5 vertices per face for a dodecahedron)
  const faces = [
    [0, 8, 4, 14, 12],
    [0, 12, 16, 17, 2],
    [0, 2, 10, 8],
    [1, 9, 5, 15, 13],
    [1, 13, 17, 16, 3],
    [1, 3, 11, 9],
    [2, 17, 13, 14, 10],
    [3, 16, 12, 15, 11],
    [4, 8, 10, 18, 19],
    [5, 9, 11, 19, 18],
    [6, 7, 19, 18, 14],
    [6, 14, 15, 7],
    [4, 19, 7, 6, 5],
    [4, 5, 15, 14],
    [6, 18, 10, 2, 3],
    [6, 3, 7],
    [7, 11, 19],
    [8, 0, 4],
    [9, 1, 5],
    [13, 15, 12],
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

function BoundaryPlane({ position, normal }) {
  usePlane(() => ({
    position,
    type: "Static",
    rotation: [0, 0, 0],
    normal: [normal.x, normal.y, normal.z],
  }));

  return null; // Invisible collision plane
}

// Ball component with physics
function Ball({ position, color }) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: [0.5],
    linearDamping: 0.1,
    restitution: 0.7, // Bounciness
  }));

  // Random initial velocity
  useEffect(() => {
    api.velocity.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
    );

    // Apply small random forces periodically to keep balls moving
    const interval = setInterval(() => {
      api.applyForce(
        [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ],
        [0, 0, 0],
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Generate 10 balls with random positions and colors
function Balls() {
  const colors = Array(10)
    .fill()
    .map(() => getRandomColor());

  return (
    <>
      {Array(10)
        .fill()
        .map((_, i) => (
          <Ball
            key={i}
            position={[
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 3,
              (Math.random() - 0.5) * 3,
            ]}
            color={colors[i]}
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
          gravity={[0, -3, 0]}
          iterations={20}
          defaultContactMaterial={{ restitution: 0.7 }}
        >
          <Dodecahedron position={[0, 0, 0]} />
          <DodecahedronBoundary />
          <Balls />
        </Physics>
        <OrbitControls enableZoom={true} enablePan={true} />
      </Canvas>

      <div className="absolute top-4 left-4 text-white">
        <h1 className="mb-2 text-2xl font-bold">3D Dodecahedron</h1>
        <p>A twelve-sided polygon with physics-based balls</p>
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