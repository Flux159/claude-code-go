"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, usePlane, useSphere } from "@react-three/cannon";
import * as THREE from "three";
import Link from "next/link";

// Neon color palette
const neonColors = [
  new THREE.Color(0xff00ff), // Magenta
  new THREE.Color(0x00ffff), // Cyan
  new THREE.Color(0xffff00), // Yellow
  new THREE.Color(0xff9500), // Orange
  new THREE.Color(0x39ff14), // Green
  new THREE.Color(0xfe01fe), // Pink
  new THREE.Color(0x01fffe), // Blue
];

// Random neon color generator
const getRandomNeonColor = () => {
  return neonColors[Math.floor(Math.random() * neonColors.length)];
};

// Glowing container
function Container() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (mesh.current) {
      const t = clock.getElapsedTime();
      mesh.current.rotation.x = Math.sin(t * 0.1) * 0.05;
      mesh.current.rotation.y = Math.sin(t * 0.1) * 0.05;
    }
  });

  return (
    <mesh ref={mesh} scale={1}>
      <dodecahedronGeometry args={[10, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#222222"
        transparent={true}
        opacity={0.1}
        side={THREE.DoubleSide}
        wireframe={true}
      />
    </mesh>
  );
}

// Create physical boundaries
function Boundaries() {
  const size = 10;
  
  // Create 6 planes for a box boundary
  return (
    <>
      <Plane position={[0, -size, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <Plane position={[0, size, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <Plane position={[-size, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Plane position={[size, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <Plane position={[0, 0, -size]} rotation={[0, 0, 0]} />
      <Plane position={[0, 0, size]} rotation={[0, Math.PI, 0]} />
    </>
  );
}

// Simple plane for physics boundary
function Plane({ position, rotation }: { position: number[], rotation: number[] }) {
  usePlane(() => ({
    position,
    rotation,
    type: "Static",
  }));

  const color = getRandomNeonColor();
  
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={0.2}
        side={THREE.DoubleSide} 
        transparent={true} 
        opacity={0.05} 
      />
    </mesh>
  );
}

// Glowing particle with physics
function NeonParticle({ position, color }: { position: number[], color: THREE.Color }) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: [0.5],
    linearDamping: 0.05,
    restitution: 0.9,
  }));

  // Glow effect using a point light
  const pointLightRef = useRef<THREE.PointLight>(null);
  
  useFrame(() => {
    if (pointLightRef.current) {
      // Slight pulsing effect
      pointLightRef.current.intensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.1;
    }
  });

  // Random initial velocity
  useEffect(() => {
    // Set initial velocity
    api.velocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );

    // Apply small random forces to keep particles moving
    const interval = setInterval(() => {
      api.applyForce(
        [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
        ],
        [0, 0, 0]
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [api]);

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={1.0}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      <pointLight 
        ref={pointLightRef}
        distance={4} 
        intensity={0.6} 
        color={color} 
      />
    </group>
  );
}

// Generate multiple particles with random positions and colors
function Particles({ count = 25 }) {
  // Memoize positions and colors
  const particleData = useMemo(() => {
    return Array(count).fill(null).map(() => ({
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ] as [number, number, number],
      color: getRandomNeonColor()
    }));
  }, [count]);

  return (
    <>
      {particleData.map((data, i) => (
        <NeonParticle
          key={i}
          position={data.position}
          color={data.color}
        />
      ))}
    </>
  );
}

export default function NeonPhysicsSimulator() {
  return (
    <div className="h-screen w-full bg-black">
      <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
        <fog attach="fog" args={["black", 15, 30]} />
        <ambientLight intensity={0.1} />
        
        <Physics
          gravity={[0, -2, 0]}
          iterations={20}
          size={20}
          allowSleep={false}
          defaultContactMaterial={{ restitution: 0.8, friction: 0.1 }}
        >
          <Container />
          <Boundaries />
          <Particles count={30} />
        </Physics>
        
        <OrbitControls enableZoom={true} enablePan={true} />
      </Canvas>

      <div className="absolute top-4 left-4 text-white">
        <h1 className="mb-2 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-yellow-300">
          Neon Physics Simulator
        </h1>
        <p className="text-cyan-300">Glowing particles bouncing in a virtual space</p>
        <p className="mt-2 text-xs text-gray-400">Drag to rotate • Scroll to zoom</p>
      </div>

      <div className="absolute bottom-4 left-4">
        <Link
          href="/"
          className="inline-block rounded-lg bg-gradient-to-r from-pink-600 to-cyan-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}