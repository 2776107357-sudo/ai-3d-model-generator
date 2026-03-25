'use client';

import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF, Center } from '@react-three/drei';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';

interface ModelViewerProps {
  modelUrl: string;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url) as { scene: THREE.Group };
  
  return (
    <Center>
      <primitive object={scene} scale={1} />
    </Center>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#888" wireframe />
    </mesh>
  );
}

export default function ModelViewer({ modelUrl }: ModelViewerProps) {
  return (
    <div className="w-full h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg relative">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        
        <Suspense fallback={<LoadingFallback />}>
          <Model url={modelUrl} />
          <ContactShadows
            position={[0, -0.8, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={4}
          />
          <Environment preset="studio" />
        </Suspense>
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={10}
        />
      </Canvas>
      
      {/* 控制提示 */}
      <div className="absolute bottom-4 left-4 text-white/60 text-xs bg-black/30 px-3 py-1.5 rounded">
        鼠标拖拽旋转 | 滚轮缩放
      </div>
    </div>
  );
}
