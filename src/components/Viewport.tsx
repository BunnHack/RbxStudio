/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Anchor,
  Copy,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { RobloxInstance, Vector3 } from '../types';
import * as THREE from 'three';

interface ViewportProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

const STUDS_TO_PIXELS = 8; // Scale factor

// Custom Wedge geometry builder (Prism shape)
const createWedgeGeometry = () => {
  const vertices = new Float32Array([
    // Back face (quad, 2 triangles)
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5,

    // Bottom face (quad, 2 triangles)
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,

    // Slope face (quad, 2 triangles)
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,

    // Left triangle face
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,

    // Right triangle face
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5, -0.5,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
};

// Material helpers
const createNewMaterial = (materialType: string) => {
  if (materialType === 'Neon') {
    return new THREE.MeshBasicMaterial();
  }
  if (materialType === 'Glass') {
    return new THREE.MeshPhysicalMaterial({
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
    });
  }
  return new THREE.MeshStandardMaterial();
};

const updateMaterialProperties = (
  material: THREE.Material,
  materialType: string,
  color: string,
  transparency: number,
  isWireframe: boolean
) => {
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.color.setStyle(color);
    material.transparent = transparency > 0;
    material.opacity = 1 - transparency;
    material.wireframe = isWireframe;

    switch (materialType) {
      case 'SmoothPlastic':
        material.roughness = 0.3;
        material.metalness = 0.1;
        break;
      case 'Wood':
        material.roughness = 0.9;
        material.metalness = 0.05;
        break;
      case 'Slate':
        material.roughness = 0.95;
        material.metalness = 0.1;
        break;
      case 'Grass':
        material.roughness = 0.9;
        material.metalness = 0.0;
        break;
      case 'Brick':
        material.roughness = 0.85;
        material.metalness = 0.05;
        break;
      case 'Metal':
        material.roughness = 0.2;
        material.metalness = 0.9;
        break;
      case 'Plastic':
      default:
        material.roughness = 0.7;
        material.metalness = 0.1;
        break;
    }
  } else if (material instanceof THREE.MeshBasicMaterial) {
    material.color.setStyle(color);
    material.transparent = transparency > 0;
    material.opacity = 1 - transparency;
    material.wireframe = isWireframe;
  }
};

export default function Viewport({ state }: ViewportProps) {
  const {
    instances,
    selectedInstanceId,
    setSelectedInstanceId,
    activeTool,
    simulationState,
    showGrid,
    wireframe,
    showUi,
    updateInstanceProperties,
    duplicateInstance,
    deleteInstance,
    addLog,
    gridSnapEnabled,
    gridSnapSize,
  } = state;

  // Camera Orbit States
  const [pitch, setPitch] = useState(-30);
  const [yaw, setYaw] = useState(45);
  const [distance, setDistance] = useState(300);
  const [cameraTarget, setCameraTarget] = useState<Vector3>({ x: 0, y: 0, z: 0 });
  
  const [isOrbiting, setIsOrbiting] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, pitch: 0, yaw: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const mouseDownPos = useRef({ x: 0, y: 0 });

  // Three.js Core Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const meshesRef = useRef<Record<string, THREE.Mesh>>({});
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
  const geometriesRef = useRef<Record<string, THREE.BufferGeometry>>({});

  // Camera settings ref for render loop
  const cameraStateRef = useRef({ pitch, yaw, distance, cameraTarget });
  useEffect(() => {
    cameraStateRef.current = { pitch, yaw, distance, cameraTarget };
  }, [pitch, yaw, distance, cameraTarget]);

  // Keyboard Panning (WASD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const step = 4;
      const angleRad = (yaw * Math.PI) / 180;
      const cosY = Math.cos(angleRad);
      const sinY = Math.sin(angleRad);

      let dx = 0;
      let dz = 0;
      let dy = 0;

      switch (e.key.toLowerCase()) {
        case 'w':
          dx = -sinY * step;
          dz = -cosY * step;
          break;
        case 's':
          dx = sinY * step;
          dz = cosY * step;
          break;
        case 'a':
          dx = -cosY * step;
          dz = sinY * step;
          break;
        case 'd':
          dx = cosY * step;
          dz = -sinY * step;
          break;
        case 'q':
          dy = step;
          break;
        case 'e':
          dy = -step;
          break;
        case 'f':
          if (selectedInstanceId) {
            const inst = instances[selectedInstanceId];
            if (inst && inst.properties.Position) {
              setCameraTarget(inst.properties.Position);
              addLog(`Focused camera on: '${inst.name}'`, 'info');
            }
          }
          break;
        default:
          return;
      }

      setCameraTarget((prev) => ({
        x: prev.x + dx / STUDS_TO_PIXELS,
        y: prev.y + dy / STUDS_TO_PIXELS,
        z: prev.z + dz / STUDS_TO_PIXELS,
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [yaw, selectedInstanceId, instances, addLog]);

  // Orbit Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };

    if (e.button === 2 || e.button === 0) {
      let hitPart = false;
      if (e.button === 0 && rendererRef.current && cameraRef.current) {
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        const intersects = raycaster.intersectObjects(Object.values(meshesRef.current), true);
        if (intersects.length > 0) {
          hitPart = true;
        }
      }

      if (e.button === 2 || (e.button === 0 && !hitPart)) {
        e.preventDefault();
        setIsOrbiting(true);
        dragStart.current = {
          x: e.clientX,
          y: e.clientY,
          pitch,
          yaw,
        };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isOrbiting) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    setYaw((dragStart.current.yaw - dx * 0.5) % 360);
    setPitch(Math.max(-85, Math.min(85, dragStart.current.pitch + dy * 0.5)));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsOrbiting(false);

    // Quick click selector
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        const intersects = raycaster.intersectObjects(Object.values(meshesRef.current), true);

        if (intersects.length > 0) {
          let hitObj: THREE.Object3D | null = intersects[0].object;
          let partId: string | undefined = undefined;

          while (hitObj && hitObj !== sceneRef.current) {
            partId = Object.keys(meshesRef.current).find(key => meshesRef.current[key] === hitObj);
            if (partId) break;
            hitObj = hitObj.parent;
          }

          if (partId) {
            const inst = instances[partId];
            if (inst?.properties.Locked && activeTool === 'Select') {
              addLog(`Instance '${inst.name}' is Locked. Unlock in Properties to edit.`, 'warn');
              return;
            }
            setSelectedInstanceId(partId);
          }
        } else {
          setSelectedInstanceId(null);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    setDistance((prev) => Math.max(80, Math.min(1000, prev + e.deltaY * 0.5)));
  };

  const handlePreventContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Quick Shifters
  const shiftSelectedPart = (axis: 'x' | 'y' | 'z', dir: number) => {
    if (!selectedInstanceId) return;
    const part = instances[selectedInstanceId];
    if (!part || !part.properties.Position) return;

    const currentPos = part.properties.Position;
    const step = gridSnapEnabled ? gridSnapSize : 1;
    let delta = step * dir;
    let newVector = { ...currentPos, [axis]: currentPos[axis] + delta };

    if (gridSnapEnabled) {
      newVector[axis] = Math.round(newVector[axis] / gridSnapSize) * gridSnapSize;
    }

    updateInstanceProperties(selectedInstanceId, { Position: newVector });
  };

  const scaleSelectedPart = (axis: 'x' | 'y' | 'z', dir: number) => {
    if (!selectedInstanceId) return;
    const part = instances[selectedInstanceId];
    if (!part || !part.properties.Size) return;

    const currentSize = part.properties.Size;
    const step = gridSnapEnabled ? gridSnapSize : 1;
    const delta = step * dir;
    const newSize = { ...currentSize, [axis]: Math.max(0.5, currentSize[axis] + delta) };

    updateInstanceProperties(selectedInstanceId, { Size: newSize });
  };

  const rotateSelectedPart = (axis: 'x' | 'y' | 'z') => {
    if (!selectedInstanceId) return;
    const part = instances[selectedInstanceId];
    if (!part || !part.properties.Rotation) return;

    const currentRot = part.properties.Rotation;
    const step = state.rotateSnapEnabled ? state.rotateSnapAngle : 90;
    const newRot = { ...currentRot, [axis]: (currentRot[axis] + step) % 360 };

    updateInstanceProperties(selectedInstanceId, { Rotation: newRot });
  };

  // Setup Three.js Context
  useEffect(() => {
    if (!viewportRef.current) return;

    // Instantiate geometries on and after mount inside React life-cycle
    geometriesRef.current = {
      Block: new THREE.BoxGeometry(1, 1, 1),
      Sphere: new THREE.SphereGeometry(0.5, 32, 32),
      Cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
      Wedge: createWedgeGeometry(),
    };

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x181a1c, 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.outline = 'none';
    rendererRef.current = renderer;

    viewportRef.current.appendChild(renderer.domElement);

    // Lights Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 60, 40);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Grid System Helper
    const gridHelper = new THREE.GridHelper(200, 200, 0x555555, 0x2d3035);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(viewportRef.current);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (cameraRef.current && rendererRef.current && sceneRef.current) {
        const { pitch, yaw, distance, cameraTarget } = cameraStateRef.current;

        const pitchRad = (pitch * Math.PI) / 180;
        const yawRad = (yaw * Math.PI) / 180;
        const dist = distance / 8;

        const x = cameraTarget.x + dist * Math.sin(yawRad) * Math.cos(pitchRad);
        const y = cameraTarget.y - dist * Math.sin(pitchRad);
        const z = cameraTarget.z + dist * Math.cos(yawRad) * Math.cos(pitchRad);

        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z));

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      if (viewportRef.current && renderer.domElement && viewportRef.current.contains(renderer.domElement)) {
        viewportRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();

      (Object.values(meshesRef.current) as THREE.Mesh[]).forEach((m) => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          (m.material as THREE.Material[]).forEach(mat => mat.dispose());
        } else {
          (m.material as THREE.Material).dispose();
        }
      });
      meshesRef.current = {};

      (Object.values(geometriesRef.current) as THREE.BufferGeometry[]).forEach((g) => g.dispose());

      if (selectionBoxRef.current) {
        scene.remove(selectionBoxRef.current);
      }
      if (axesHelperRef.current) {
        scene.remove(axesHelperRef.current);
      }
    };
  }, []);

  const renderedParts = (Object.values(instances) as RobloxInstance[]).filter(
    (inst) => inst.className === 'Part' || inst.className === 'SpawnLocation'
  );

  const selectedPart = selectedInstanceId ? instances[selectedInstanceId] : null;
  const isPartSelected = selectedPart && (selectedPart.className === 'Part' || selectedPart.className === 'SpawnLocation');

  // Synchronize dynamic states of Roblox objects to ThreeJS Scene
  useEffect(() => {
    if (!sceneRef.current || Object.keys(geometriesRef.current).length === 0) return;

    const scene = sceneRef.current;
    const activeIds = new Set<string>();
    const GEOMETRIES = geometriesRef.current;

    renderedParts.forEach((part) => {
      activeIds.add(part.id);

      const pos = part.properties.Position || { x: 0, y: 0, z: 0 };
      const size = part.properties.Size || { x: 4, y: 4, z: 4 };
      const rot = part.properties.Rotation || { x: 0, y: 0, z: 0 };
      const color = part.properties.Color || '#8D9094';
      const transp = part.properties.Transparency !== undefined ? part.properties.Transparency : 0;
      const shape = part.properties.Shape || 'Block';
      const materialType = part.properties.Material || 'Plastic';

      let mesh = meshesRef.current[part.id];

      if (!mesh) {
        const geo = GEOMETRIES[shape] || GEOMETRIES.Block;
        const mat = createNewMaterial(materialType);
        mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        meshesRef.current[part.id] = mesh;

        if (part.className === 'SpawnLocation') {
          const decalGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16);
          const decalMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
          const decalMesh = new THREE.Mesh(decalGeo, decalMat);
          decalMesh.name = 'spawnDecal';
          decalMesh.position.y = 0.5 + 0.03;
          mesh.add(decalMesh);
        }
      } else {
        const expectedGeo = GEOMETRIES[shape] || GEOMETRIES.Block;
        if (mesh.geometry !== expectedGeo) {
          mesh.geometry = expectedGeo;
        }

        const isNeon = materialType === 'Neon';
        const isGlass = materialType === 'Glass';
        const currentIsNeon = mesh.material instanceof THREE.MeshBasicMaterial;
        const currentIsGlass = mesh.material instanceof THREE.MeshPhysicalMaterial;

        let needNewMat = false;
        if (isNeon && !currentIsNeon) needNewMat = true;
        if (isGlass && !currentIsGlass) needNewMat = true;
        if (!isNeon && !isGlass && (currentIsNeon || currentIsGlass)) needNewMat = true;

        if (needNewMat) {
          mesh.material.dispose();
          mesh.material = createNewMaterial(materialType);
        }
      }

      updateMaterialProperties(mesh.material, materialType, color, transp, wireframe);

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.scale.set(size.x, size.y, size.z);
      mesh.rotation.set(
        (rot.x * Math.PI) / 180,
        (rot.y * Math.PI) / 180,
        (rot.z * Math.PI) / 180
      );
    });

    // Remove old meshes
    Object.keys(meshesRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        const mesh = meshesRef.current[id];
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
        delete meshesRef.current[id];
      }
    });

    // Handle Selection Blue Highlight Box
    if (selectedInstanceId && meshesRef.current[selectedInstanceId]) {
      const selectedMesh = meshesRef.current[selectedInstanceId];
      if (selectionBoxRef.current) {
        selectionBoxRef.current.setFromObject(selectedMesh);
        selectionBoxRef.current.update();
        selectionBoxRef.current.visible = true;
      } else {
        const boxHelper = new THREE.BoxHelper(selectedMesh, 0x00a2ff);
        scene.add(boxHelper);
        selectionBoxRef.current = boxHelper;
      }
    } else {
      if (selectionBoxRef.current) {
        selectionBoxRef.current.visible = false;
      }
    }

    // 3D coordinate Axis translation guide
    if (isPartSelected && activeTool !== 'Select' && selectedInstanceId && meshesRef.current[selectedInstanceId]) {
      const selectedMesh = meshesRef.current[selectedInstanceId];
      if (!axesHelperRef.current) {
        axesHelperRef.current = new THREE.AxesHelper(5);
        scene.add(axesHelperRef.current);
      }
      axesHelperRef.current.position.copy(selectedMesh.position);
      axesHelperRef.current.visible = true;
    } else {
      if (axesHelperRef.current) {
        axesHelperRef.current.visible = false;
      }
    }

    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }

    // Synchronize global Lighting properties
    const lighting = instances['Lighting']?.properties;
    if (lighting) {
      if (lighting.Ambient && ambientLightRef.current) {
        ambientLightRef.current.color.setStyle(lighting.Ambient);
      }
      if (lighting.Brightness !== undefined && dirLightRef.current) {
        dirLightRef.current.intensity = lighting.Brightness * 0.4;
      }
    }
  }, [instances, selectedInstanceId, wireframe, activeTool, isPartSelected, showGrid]);

  return (
    <div
      ref={viewportRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsOrbiting(false)}
      onWheel={handleWheel}
      onContextMenu={handlePreventContextMenu}
      className="w-full h-full bg-[#181A1C] relative overflow-hidden select-none cursor-grab active:cursor-grabbing border-b border-[#101113]"
      id="studio-viewport"
    >
      {/* Control Instruction Overlay Legend (Top-Left) */}
      <div className="absolute top-3 left-3 bg-[#1A1C1F]/80 border border-gray-800 rounded-lg p-2.5 max-w-[210px] text-[10px] text-gray-400 select-none pointer-events-none font-sans backdrop-blur-sm shadow-lg leading-normal flex flex-col gap-1 z-10">
        <div className="font-semibold text-yellow-500 flex items-center gap-1">
          <HelpCircle size={12} /> Viewport Controls:
        </div>
        <div>• <span className="text-gray-200 font-bold">Right-click + Drag</span> to Orbit</div>
        <div>• <span className="text-gray-200 font-bold">Scroll Wheel</span> to Zoom In/Out</div>
        <div>• <span className="text-gray-200 font-bold">WASD keys</span> to Pan World Focus</div>
        <div>• <span className="text-gray-200 font-bold">QE keys</span> to Raise/Lower Focus</div>
        <div>• <span className="text-gray-200 font-bold">F key</span> to Focus Selected Part</div>
        {simulationState !== 'Stopped' && (
          <div className="text-green-500 animate-pulse font-semibold mt-1">
            ● Physics & Scripts Simulating!
          </div>
        )}
      </div>

      {/* active gizmo helper controls (Bottom-Left) */}
      {isPartSelected && showUi && (
        <div className="absolute bottom-3 left-3 bg-[#1A1C1F]/90 border border-gray-800 rounded-lg p-3 w-[260px] font-sans select-none backdrop-blur shadow-2xl flex flex-col gap-2 z-20">
          <div className="flex items-center justify-between border-b border-gray-800 pb-1.5 mb-1">
            <span className="font-bold text-[11px] text-[#00A2FF] truncate max-w-[130px]" title={selectedPart.name}>
              🧱 {selectedPart.name}
            </span>
            <span className="text-[9px] bg-gray-800 px-1 py-0.2 rounded text-gray-400">
              Tool: {activeTool}
            </span>
          </div>

          {/* Quick Transform Shifter */}
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Position Offset (Studs)</div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => shiftSelectedPart('x', -1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-red-400 font-mono cursor-pointer">-X</button>
              <button onClick={() => shiftSelectedPart('y', 1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-green-400 font-mono cursor-pointer">+Y</button>
              <button onClick={() => shiftSelectedPart('z', -1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-blue-400 font-mono cursor-pointer">-Z</button>

              <button onClick={() => shiftSelectedPart('x', 1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-red-400 font-mono cursor-pointer">+X</button>
              <button onClick={() => shiftSelectedPart('y', -1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-green-400 font-mono cursor-pointer">-Y</button>
              <button onClick={() => shiftSelectedPart('z', 1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-blue-400 font-mono cursor-pointer">+Z</button>
            </div>
          </div>

          {/* Size Scaling Gizmo */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Size Dimensions (Scale)</div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => scaleSelectedPart('x', 1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-red-400 font-mono cursor-pointer">+W</button>
              <button onClick={() => scaleSelectedPart('y', 1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-green-400 font-mono cursor-pointer">+H</button>
              <button onClick={() => scaleSelectedPart('z', 1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-blue-400 font-mono cursor-pointer">+D</button>

              <button onClick={() => scaleSelectedPart('x', -1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-red-400 font-mono cursor-pointer">-W</button>
              <button onClick={() => scaleSelectedPart('y', -1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-green-400 font-mono cursor-pointer">-H</button>
              <button onClick={() => scaleSelectedPart('z', -1)} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-blue-400 font-mono cursor-pointer">-D</button>
            </div>
          </div>

          {/* Rotation Increments */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Rotate Increments</div>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => rotateSelectedPart('x')} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-red-400 font-mono cursor-pointer">Rot X</button>
              <button onClick={() => rotateSelectedPart('y')} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-green-400 font-mono cursor-pointer">Rot Y</button>
              <button onClick={() => rotateSelectedPart('z')} className="bg-[#25282D] border border-gray-800 hover:bg-[#2F3238] hover:text-white rounded py-0.5 text-center text-[10px] text-blue-400 font-mono cursor-pointer">Rot Z</button>
            </div>
          </div>

          {/* Fast Actions Bottom bar */}
          <div className="flex items-center justify-between border-t border-gray-800 pt-2 mt-1 gap-2">
            <button
              onClick={() => {
                const isAnchored = selectedPart.properties.Anchored;
                updateInstanceProperties(selectedInstanceId, { Anchored: !isAnchored });
              }}
              title="Anchor part to stay in place"
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                selectedPart.properties.Anchored
                  ? 'bg-blue-950/20 border-blue-800 text-[#00A2FF]'
                  : 'bg-transparent border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Anchor size={11} />
              <span>Anchor</span>
            </button>
            
            <button
              onClick={() => duplicateInstance(selectedInstanceId)}
              title="Duplicate (Ctrl+D)"
              className="px-2 py-1 bg-transparent border border-gray-800 hover:bg-gray-800 hover:text-white rounded text-[10px] text-gray-400 flex items-center justify-center cursor-pointer"
            >
              <Copy size={11} />
            </button>

            <button
              onClick={() => deleteInstance(selectedInstanceId)}
              title="Delete Part"
              className="px-2 py-1 bg-transparent border border-gray-800 hover:bg-red-950/40 hover:border-red-800 hover:text-red-400 rounded text-[10px] text-gray-400 flex items-center justify-center cursor-pointer"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Compass indicator widget (Top-Right) */}
      <div className="absolute top-3 right-3 bg-[#1A1C1F]/80 border border-gray-800 p-2 rounded-full pointer-events-none select-none text-[#00A2FF] animate-pulse z-10">
        <Compass size={22} className="transform" style={{ transform: `rotate(${-yaw}deg)` }} />
      </div>
    </div>
  );
}
