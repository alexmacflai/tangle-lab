import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildTerrainGeometry(model, heightScale) {
  const gridSize = model.gridSize;
  const worldSize = gridSize - 1;
  const verticalScale = 0.068;
  const heightBoost = clamp(heightScale / 100, 0.6, 2.8);

  const geometry = new THREE.PlaneGeometry(worldSize, worldSize, gridSize - 1, gridSize - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();

  let maxHeight = 0;

  for (let index = 0; index < positions.count; index += 1) {
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);
    const cell = model.cells[y * gridSize + x];

    const height = (cell?.heightPx ?? 0) * heightBoost * verticalScale;
    positions.setY(index, height);
    maxHeight = Math.max(maxHeight, height);

    color.set(cell?.color || '#071B2E');
    if (cell?.count > 0) {
      color.lerp(new THREE.Color('#AB3DFF'), 0.09);
      color.multiplyScalar(1.08);
    } else {
      color.lerp(new THREE.Color('#748EA7'), 0.16);
      color.multiplyScalar(1.02);
    }

    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return { geometry, worldSize, maxHeight };
}

function selectedCellPosition(model, selectedCellId, heightScale) {
  if (selectedCellId === null || selectedCellId === undefined) return null;

  const gridSize = model.gridSize;
  const cell = model.cells.find((entry) => entry.index === selectedCellId);
  if (!cell) return null;

  const worldSize = gridSize - 1;
  const x = cell.x - worldSize / 2;
  const z = cell.y - worldSize / 2;
  const y = cell.heightPx * clamp(heightScale / 100, 0.6, 2.8) * 0.09 + 0.25;

  return [x, y, z];
}

function TerrainMesh({ model, heightScale, onSelectCell }) {
  const { geometry, worldSize } = useMemo(() => buildTerrainGeometry(model, heightScale), [model, heightScale]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <group>
      <mesh
        geometry={geometry}
        onPointerDown={(event) => {
          event.stopPropagation();

          const local = event.point;
          const gridSize = model.gridSize;
          const x = clamp(Math.round(local.x + worldSize / 2), 0, gridSize - 1);
          const y = clamp(Math.round(local.z + worldSize / 2), 0, gridSize - 1);
          const index = y * gridSize + x;

          if (model.cells[index]?.count > 0) {
            onSelectCell(index);
          }
        }}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.9}
          metalness={0.03}
          emissive="#020E19"
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh geometry={geometry} position={[0, 0.02, 0]} raycast={() => null}>
        <meshBasicMaterial color="#AB3DFF" wireframe transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

function CameraController({ model, heightScale, resetSignal }) {
  const controlsRef = useRef(null);

  const initialCamera = useMemo(() => {
    const worldSize = model.gridSize - 1;
    const height = Math.max(3.5, ((model.cells.reduce((max, cell) => Math.max(max, cell.heightPx), 0) * heightScale) / 100) * 0.08);
    return {
      position: [0, worldSize * 0.62 + height, worldSize * 0.9 + height * 1.4],
      target: [0, height * 0.38, 0],
      maxDistance: worldSize * 2.2 + height * 3.2
    };
  }, [model, heightScale]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.object.position.set(...initialCamera.position);
    controls.target.set(...initialCamera.target);
    controls.update();
  }, [initialCamera, resetSignal]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableRotate
      enableZoom
      target={initialCamera.target}
      minDistance={6}
      maxDistance={initialCamera.maxDistance}
      maxPolarAngle={Math.PI / 2.08}
      minPolarAngle={0.25}
      dampingFactor={0.08}
      enableDamping
    />
  );
}

export default function MyWorldTerrain3D({ model, heightScale, selectedCellId, onSelectCell, resetSignal }) {
  const worldSize = model.gridSize - 1;
  const selectionPosition = useMemo(
    () => selectedCellPosition(model, selectedCellId, heightScale),
    [model, selectedCellId, heightScale]
  );

  const fogFar = Math.max(52, worldSize * 3.2);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1200 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#071B2E']} />
        <fog attach="fog" args={['#071B2E', 12, fogFar]} />

        <ambientLight intensity={0.82} color="#B2C3D3" />
        <hemisphereLight intensity={1.05} color="#AB3DFF" groundColor="#5B758F" />
        <directionalLight intensity={1.38} position={[30, 42, 24]} color="#AB3DFF" />
        <directionalLight intensity={0.78} position={[-26, 24, -30]} color="#748EA7" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
          <planeGeometry args={[worldSize * 1.9, worldSize * 1.9]} />
          <meshStandardMaterial color="#16314A" roughness={0.98} metalness={0.01} />
        </mesh>

        <group onPointerMissed={() => onSelectCell(null)}>
          <TerrainMesh model={model} heightScale={heightScale} onSelectCell={onSelectCell} />

          {selectionPosition ? (
            <mesh position={selectionPosition}>
              <torusGeometry args={[0.46, 0.085, 14, 40]} />
              <meshStandardMaterial color="#AB3DFF" emissive="#4f1f80" emissiveIntensity={0.45} />
            </mesh>
          ) : null}
        </group>

        <CameraController model={model} heightScale={heightScale} resetSignal={resetSignal} />
      </Canvas>
    </div>
  );
}
