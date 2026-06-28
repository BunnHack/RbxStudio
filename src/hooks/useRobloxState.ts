/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RobloxInstance,
  LogMessage,
  OpenScriptTab,
  StudioTab,
  ActiveTool,
  StudioState,
  InstanceClass,
  PartShape,
  PartMaterial,
  Vector3,
} from '../types';
import { transpileLuaToJS } from '../utils/luaTranspiler';
import { parseRobloxFile } from '../utils/robloxParser';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Default instances
const createDefaultInstances = (): Record<string, RobloxInstance> => {
  return {
    Workspace: {
      id: 'Workspace',
      name: 'Workspace',
      className: 'Workspace',
      parentId: null,
      properties: {},
    },
    Baseplate: {
      id: 'Baseplate',
      name: 'Baseplate',
      className: 'Part',
      parentId: 'Workspace',
      properties: {
        Name: 'Baseplate',
        ClassName: 'Part',
        Color: '#3A5F25', // Nice grass green
        Material: 'Grass',
        Size: { x: 100, y: 1, z: 100 },
        Position: { x: 0, y: -0.5, z: 0 },
        Rotation: { x: 0, y: 0, z: 0 },
        Anchored: true,
        CanCollide: true,
        Transparency: 0,
        Reflectance: 0.1,
        Shape: 'Block',
        Locked: true,
      },
    },
    SpawnLocation: {
      id: 'SpawnLocation',
      name: 'SpawnLocation',
      className: 'SpawnLocation',
      parentId: 'Workspace',
      properties: {
        Name: 'SpawnLocation',
        ClassName: 'SpawnLocation',
        Color: '#D3D3D3', // Light gray
        Material: 'SmoothPlastic',
        Size: { x: 6, y: 0.5, z: 6 },
        Position: { x: 0, y: 0.25, z: 0 },
        Rotation: { x: 0, y: 0, z: 0 },
        Anchored: true,
        CanCollide: true,
        Transparency: 0,
      },
    },
    Players: {
      id: 'Players',
      name: 'Players',
      className: 'Players',
      parentId: null,
      properties: {},
    },
    Lighting: {
      id: 'Lighting',
      name: 'Lighting',
      className: 'Lighting',
      parentId: null,
      properties: {
        Name: 'Lighting',
        ClassName: 'Lighting',
        Ambient: '#707070',
        Brightness: 2,
        TimeOfDay: '14:00:00',
        GlobalShadows: true,
      },
    },
    MaterialService: {
      id: 'MaterialService',
      name: 'MaterialService',
      className: 'MaterialService',
      parentId: null,
      properties: {},
    },
    ReplicatedStorage: {
      id: 'ReplicatedStorage',
      name: 'ReplicatedStorage',
      className: 'ReplicatedStorage',
      parentId: null,
      properties: {},
    },
    ServerScriptService: {
      id: 'ServerScriptService',
      name: 'ServerScriptService',
      className: 'ServerScriptService',
      parentId: null,
      properties: {},
    },
    ServerStorage: {
      id: 'ServerStorage',
      name: 'ServerStorage',
      className: 'ServerStorage',
      parentId: null,
      properties: {},
    },
    StarterGui: {
      id: 'StarterGui',
      name: 'StarterGui',
      className: 'StarterGui',
      parentId: null,
      properties: {},
    },
    StarterPack: {
      id: 'StarterPack',
      name: 'StarterPack',
      className: 'StarterPack',
      parentId: null,
      properties: {},
    },
    StarterPlayer: {
      id: 'StarterPlayer',
      name: 'StarterPlayer',
      className: 'StarterPlayer',
      parentId: null,
      properties: {},
    },
  };
};

export function useRobloxState() {
  const [instances, setInstances] = useState<Record<string, RobloxInstance>>(createDefaultInstances);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [expandedInstanceIds, setExpandedInstanceIds] = useState<Set<string>>(
    new Set(['Workspace', 'Players', 'Lighting'])
  );
  
  const [activeTab, setActiveTab] = useState<StudioTab>('Home');
  const [activeTool, setActiveTool] = useState<ActiveTool>('Select');
  
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [gridSnapSize, setGridSnapSize] = useState(1); // stud
  const [rotateSnapEnabled, setRotateSnapEnabled] = useState(true);
  const [rotateSnapAngle, setRotateSnapAngle] = useState(45); // degrees
  
  const [simulationState, setSimulationState] = useState<'Stopped' | 'Playing' | 'Running'>('Stopped');
  const [outputLogs, setOutputLogs] = useState<LogMessage[]>([
    {
      id: 'init-log',
      text: 'Roblox Studio Clone v1.0.0 Initialized successfully.',
      type: 'success',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  
  const [openScripts, setOpenScripts] = useState<OpenScriptTab[]>([]);
  const [activeScriptInstanceId, setActiveScriptInstanceId] = useState<string | null>(null);
  const [viewportTab, setViewportTab] = useState<'Viewport' | 'Script'>('Viewport');
  
  const [showGrid, setShowGrid] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [showUi, setShowUi] = useState(true);
  
  const [materialFillMode, setMaterialFillMode] = useState(false);
  const [colorFillMode, setColorFillMode] = useState(false);
  const [activeColor, setActiveColor] = useState('#00A2FF'); // Roblox blue
  const [activeMaterial, setActiveMaterial] = useState<PartMaterial>('Plastic');
  const [collisionsEnabled, setCollisionsEnabled] = useState(true);
  const [joinSurfacesEnabled, setJoinSurfacesEnabled] = useState(true);

  // Undo/Redo Stacks
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  // Refs for tracking up-to-date state in async loops
  const instancesRef = useRef(instances);
  instancesRef.current = instances;

  const simulationStateRef = useRef(simulationState);
  simulationStateRef.current = simulationState;

  // Active script runner controllers
  const activeScriptAbortControllers = useRef<Map<string, AbortController>>(new Map());

  // Save current state to undo history
  const saveToHistory = useCallback(() => {
    const serialized = JSON.stringify(instancesRef.current);
    undoStack.current.push(serialized);
    redoStack.current = []; // Clear redo stack on new action
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const current = JSON.stringify(instancesRef.current);
    redoStack.current.push(current);
    
    const previous = undoStack.current.pop()!;
    const parsed = JSON.parse(previous) as Record<string, RobloxInstance>;
    setInstances(parsed);
    addLog('Undo action performed.', 'info');
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const current = JSON.stringify(instancesRef.current);
    undoStack.current.push(current);

    const next = redoStack.current.pop()!;
    const parsed = JSON.parse(next) as Record<string, RobloxInstance>;
    setInstances(parsed);
    addLog('Redo action performed.', 'info');
  }, []);

  // Logger helper
  const addLog = useCallback((text: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const newLog: LogMessage = {
      id: generateId(),
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setOutputLogs((prev) => [...prev, newLog]);
  }, []);

  const clearLogs = useCallback(() => {
    setOutputLogs([]);
  }, []);

  // Toggle Explorer Expand
  const toggleExpanded = useCallback((id: string) => {
    setExpandedInstanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Update properties of an instance
  const updateInstanceProperties = useCallback((instanceId: string, updatedProps: Partial<RobloxInstance['properties']>) => {
    setInstances((prev) => {
      const instance = prev[instanceId];
      if (!instance) return prev;

      const newProperties = { ...instance.properties, ...updatedProps };
      
      // Keep Name field in sync with standard name field
      let newName = instance.name;
      if (updatedProps.Name !== undefined) {
        newName = updatedProps.Name;
      }

      return {
        ...prev,
        [instanceId]: {
          ...instance,
          name: newName,
          properties: newProperties,
        },
      };
    });
  }, []);

  // Add an instance
  const addInstance = useCallback((
    className: InstanceClass,
    parentId: string,
    customProps?: Partial<RobloxInstance['properties']>
  ): string => {
    saveToHistory();
    const id = generateId();

    let defaultName = `${className}`;
    let properties: RobloxInstance['properties'] = {
      Name: defaultName,
      ClassName: className,
    };

    if (className === 'Part' || className === 'SpawnLocation') {
      const isPart = className === 'Part';
      // Find a slightly staggered offset position so elements don't spawn directly on top
      const siblingParts = (Object.values(instancesRef.current) as RobloxInstance[]).filter(
        (inst) => inst.parentId === 'Workspace' && (inst.className === 'Part' || inst.className === 'SpawnLocation')
      );
      const offset = siblingParts.length * 2.5;

      properties = {
        ...properties,
        Color: colorFillMode ? activeColor : '#8D9094',
        Material: materialFillMode ? activeMaterial : 'Plastic',
        Size: { x: 4, y: 4, z: 4 },
        Position: { x: offset % 15 - 5, y: 2, z: Math.floor(offset / 15) * 4 - 5 },
        Rotation: { x: 0, y: 0, z: 0 },
        Anchored: className === 'SpawnLocation' ? true : false,
        CanCollide: true,
        Transparency: 0,
        Reflectance: 0,
        Shape: isPart ? (customProps?.Shape || 'Block') : 'Block',
      };
    } else if (className === 'Script' || className === 'LocalScript') {
      properties = {
        ...properties,
        Source: `-- ${defaultName} Source code\n\nlocal part = script.Parent\nprint("Hello from " .. script.Name)\n\n-- Dynamic rotation loop\nwhile true do\n  part.Rotation.y = part.Rotation.y + 2\n  wait(0.05)\nend\n`,
        Enabled: true,
      };
    } else if (className === 'Folder' || className === 'Model') {
      properties = {
        ...properties,
      };
    }

    // Apply custom overrides
    if (customProps) {
      properties = { ...properties, ...customProps };
      if (customProps.Name) {
        defaultName = customProps.Name;
      }
    }

    const newInstance: RobloxInstance = {
      id,
      name: defaultName,
      className,
      parentId,
      properties,
    };

    setInstances((prev) => ({
      ...prev,
      [id]: newInstance,
    }));

    // Auto expand parent
    setExpandedInstanceIds((prev) => {
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });

    setSelectedInstanceId(id);
    addLog(`Inserted '${defaultName}' (Class: ${className}) into ${parentId}.`, 'info');

    return id;
  }, [saveToHistory, activeColor, activeMaterial, colorFillMode, materialFillMode, addLog]);

  // Delete instance and children
  const deleteInstance = useCallback((instanceId: string) => {
    // Prevent deleting root Services
    const protectedIds = [
      'Workspace',
      'Players',
      'Lighting',
      'MaterialService',
      'ReplicatedStorage',
      'ServerScriptService',
      'ServerStorage',
      'StarterGui',
      'StarterPack',
      'StarterPlayer',
      'Baseplate',
    ];
    if (protectedIds.includes(instanceId)) {
      addLog(`Cannot delete core system service/part '${instanceId}'.`, 'warn');
      return;
    }

    saveToHistory();

    setInstances((prev) => {
      const next = { ...prev };

      // Helper to collect all child IDs recursively
      const collectChildren = (id: string, list: string[]) => {
        (Object.values(prev) as RobloxInstance[]).forEach((inst) => {
          if (inst.parentId === id) {
            list.push(inst.id);
            collectChildren(inst.id, list);
          }
        });
      };

      const idsToDelete = [instanceId];
      collectChildren(instanceId, idsToDelete);

      // Remove from map
      idsToDelete.forEach((id) => {
        delete next[id];
      });

      // Clear open tabs if any script was deleted
      setOpenScripts((prevTabs) => {
        const nextTabs = prevTabs.filter((tab) => !idsToDelete.includes(tab.instanceId));
        if (nextTabs.length === 0) {
          setViewportTab('Viewport');
          setActiveScriptInstanceId(null);
        } else if (activeScriptInstanceId && idsToDelete.includes(activeScriptInstanceId)) {
          setActiveScriptInstanceId(nextTabs[0].instanceId);
        }
        return nextTabs;
      });

      return next;
    });

    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }

    addLog(`Deleted instance ID '${instanceId}' and its children.`, 'info');
  }, [selectedInstanceId, activeScriptInstanceId, saveToHistory, addLog]);

  // Duplicate an instance
  const duplicateInstance = useCallback((instanceId: string): string | null => {
    const source = instancesRef.current[instanceId];
    if (!source || source.parentId === null) return null;

    saveToHistory();
    const idMap: Record<string, string> = {};

    // Generate unique mapping for duplicated items
    const generateNewIds = (originalId: string) => {
      idMap[originalId] = generateId();
      (Object.values(instancesRef.current) as RobloxInstance[]).forEach((inst) => {
        if (inst.parentId === originalId) {
          generateNewIds(inst.id);
        }
      });
    };

    generateNewIds(instanceId);

    const nextInstances = { ...instancesRef.current };

    const cloneAndInsert = (origId: string, parentId: string) => {
      const origInst = instancesRef.current[origId];
      const newId = idMap[origId];

      const clonedProps = JSON.parse(JSON.stringify(origInst.properties)) as RobloxInstance['properties'];
      
      // Translate sibling properties if they are parts
      if (clonedProps.Position && origId === instanceId) {
        clonedProps.Position.x += clonedProps.Size?.x || 2; // Offset
      }
      
      if (clonedProps.Name && origId === instanceId) {
        clonedProps.Name = `${clonedProps.Name} (Copy)`;
      }

      const clonedInst: RobloxInstance = {
        id: newId,
        name: clonedProps.Name || origInst.name,
        className: origInst.className,
        parentId,
        properties: clonedProps,
      };

      nextInstances[newId] = clonedInst;

      // Clone children
      (Object.values(instancesRef.current) as RobloxInstance[]).forEach((inst) => {
        if (inst.parentId === origId) {
          cloneAndInsert(inst.id, newId);
        }
      });
    };

    cloneAndInsert(instanceId, source.parentId);
    setInstances(nextInstances);

    const duplicatedNewId = idMap[instanceId];
    setSelectedInstanceId(duplicatedNewId);

    addLog(`Duplicated '${source.name}' to '${source.name} (Copy)'.`, 'info');
    return duplicatedNewId;
  }, [saveToHistory, addLog]);

  // Script tabs helpers
  const openScript = useCallback((instanceId: string) => {
    const inst = instancesRef.current[instanceId];
    if (!inst) return;
    if (inst.className !== 'Script' && inst.className !== 'LocalScript') return;

    setOpenScripts((prev) => {
      if (prev.some((tab) => tab.instanceId === instanceId)) return prev;
      return [...prev, { instanceId, name: inst.name }];
    });

    setActiveScriptInstanceId(instanceId);
    setViewportTab('Script');
  }, []);

  const closeScriptTab = useCallback((instanceId: string) => {
    setOpenScripts((prev) => {
      const next = prev.filter((tab) => tab.instanceId !== instanceId);
      if (next.length === 0) {
        setViewportTab('Viewport');
        setActiveScriptInstanceId(null);
      } else if (activeScriptInstanceId === instanceId) {
        const nextActive = next[0].instanceId;
        setActiveScriptInstanceId(nextActive);
      }
      return next;
    });
  }, [activeScriptInstanceId]);

  // Script Runtime Engine
  const startScripts = useCallback(() => {
    // Terminate any existing scripts first
    stopScripts();

    addLog('Starting simulation environment...', 'info');

    // Filter active scripts
    const activeScripts = (Object.values(instancesRef.current) as RobloxInstance[]).filter(
      (inst) => (inst.className === 'Script' || inst.className === 'LocalScript') && inst.properties.Enabled !== false
    );

    activeScripts.forEach((scriptInst) => {
      const source = scriptInst.properties.Source || '';
      if (!source.trim()) return;

      const abortController = new AbortController();
      activeScriptAbortControllers.current.set(scriptInst.id, abortController);

      // Transpile simple Lua code to JS
      const jsCode = transpileLuaToJS(source);

      // Create wait mechanism that respects Abort Signal
      const wait = (seconds: number) => {
        return new Promise<void>((resolve, reject) => {
          if (abortController.signal.aborted) {
            reject(new Error('Script aborted'));
            return;
          }

          const timeout = setTimeout(() => {
            if (abortController.signal.aborted) {
              reject(new Error('Script aborted'));
            } else {
              resolve();
            }
          }, seconds * 1000);

          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Script aborted'));
          });
        });
      };

      // Logging functions
      const scriptPrint = (...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        addLog(`[${scriptInst.name}]: ${msg}`, 'info');
      };

      const scriptWarn = (...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        addLog(`[${scriptInst.name} WARNING]: ${msg}`, 'warn');
      };

      const scriptError = (...args: any[]) => {
        const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        addLog(`[${scriptInst.name} ERROR]: ${msg}`, 'error');
      };

      // Custom Color3 proxy helper
      const Color3 = {
        fromRGB: (r: number, g: number, b: number) => {
          const clamp = (val: number) => Math.max(0, Math.min(255, Math.floor(val)));
          const hex = '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
          return hex;
        },
        random: () => {
          return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(2, '0');
        },
      };

      // Vector3 builder
      const Vector3 = {
        new: (x: number, y: number, z: number): Vector3 => ({ x, y, z }),
      };

      // Instance.new
      const Instance = {
        new: (className: InstanceClass) => {
          if (abortController.signal.aborted) throw new Error('Script aborted');
          // Add in Workspace by default
          const newId = addInstance(className, 'Workspace', { Name: `CreatedBy_${scriptInst.name}` });
          return getPartProxy(newId);
        },
      };

      // Recursive Part state-proxy builder
      const getPartProxy = (id: string): any => {
        return new Proxy({}, {
          get(target, prop: string) {
            if (abortController.signal.aborted) throw new Error('Script aborted');
            
            const currentInst = instancesRef.current[id];
            if (!currentInst) return undefined;

            if (prop === 'Parent') {
              if (currentInst.parentId) {
                return getPartProxy(currentInst.parentId);
              }
              return null;
            }

            if (prop === 'Name') return currentInst.name;
            if (prop === 'ClassName') return currentInst.className;

            // Direct properties mapping
            if (prop in currentInst.properties) {
              const val = (currentInst.properties as any)[prop];
              // If it is a nested Vector3 object, we wrap it in a proxy to allow script.Parent.Position.y = 10
              if (val && typeof val === 'object' && 'x' in val && 'y' in val && 'z' in val) {
                return new Proxy(val, {
                  get(vTarget, vProp: string) {
                    const latestVal = (instancesRef.current[id]?.properties as any)?.[prop];
                    return latestVal?.[vProp];
                  },
                  set(vTarget, vProp: string, vVal: any) {
                    if (abortController.signal.aborted) return false;
                    const latestProps = instancesRef.current[id]?.properties || {};
                    const latestVector = (latestProps as any)?.[prop] || { x: 0, y: 0, z: 0 };
                    
                    const numVal = parseFloat(vVal);
                    if (isNaN(numVal)) return false;

                    const updatedVector = { ...latestVector, [vProp]: numVal };
                    updateInstanceProperties(id, { [prop]: updatedVector });
                    return true;
                  }
                });
              }
              return val;
            }

            return undefined;
          },
          set(target, prop: string, value: any) {
            if (abortController.signal.aborted) return false;
            const currentInst = instancesRef.current[id];
            if (!currentInst) return false;

            if (prop === 'Name') {
              updateInstanceProperties(id, { Name: value });
              return true;
            }

            // Map and update property
            updateInstanceProperties(id, { [prop]: value });
            return true;
          }
        });
      };

      // script proxy object
      const scriptProxy = {
        Parent: scriptInst.parentId ? getPartProxy(scriptInst.parentId) : null,
        Name: scriptInst.name,
        Disabled: !scriptInst.properties.Enabled,
      };

      // Game structure proxy
      const gameProxy = {
        Workspace: getPartProxy('Workspace'),
        Lighting: getPartProxy('Lighting'),
        Players: getPartProxy('Players'),
        GetService: (serviceName: string) => {
          if (instancesRef.current[serviceName]) {
            return getPartProxy(serviceName);
          }
          return null;
        },
      };

      // Assemble executor
      try {
        // Compile JS as an async function with standard Sandbox variables
        const runner = new Function(
          'script',
          'game',
          'wait',
          'print',
          'warn',
          'error',
          'Color3',
          'Instance',
          'Vector3',
          `return (async () => {
            try {
              ${jsCode}
            } catch (err) {
              if (err.message !== "Script aborted") {
                error("Runtime error: " + err.message);
              }
            }
          })();`
        );

        // Run the script in the background asynchronously
        runner(
          scriptProxy,
          gameProxy,
          wait,
          scriptPrint,
          scriptWarn,
          scriptError,
          Color3,
          Instance,
          Vector3
        );
        addLog(`Started script: '${scriptInst.name}'`, 'info');
      } catch (err: any) {
        addLog(`Compilation error in script '${scriptInst.name}': ${err.message}`, 'error');
      }
    });
  }, [addInstance, updateInstanceProperties, addLog]);

  const stopScripts = useCallback(() => {
    activeScriptAbortControllers.current.forEach((controller, scriptId) => {
      controller.abort();
      const inst = instancesRef.current[scriptId];
      if (inst) {
        addLog(`Terminated script: '${inst.name}'`, 'info');
      }
    });
    activeScriptAbortControllers.current.clear();
  }, [addLog]);

  // Start Simulation
  const startSimulation = useCallback((mode: 'Playing' | 'Running') => {
    if (simulationState !== 'Stopped') return;

    setSimulationState(mode);
    addLog(`Simulation started in '${mode}' mode.`, 'success');
    
    // Backup instances state so we can restore on Stop! This is exactly like Roblox Studio!
    const backup = JSON.stringify(instances);
    undoStack.current.push(backup); // Back up so they can revert if needed or auto restore on Stop

    // Run active scripts
    startScripts();
  }, [simulationState, instances, startScripts, addLog]);

  // Stop Simulation and RESTORE back up
  const stopSimulation = useCallback(() => {
    if (simulationState === 'Stopped') return;

    setSimulationState('Stopped');
    stopScripts();

    // Revert instances back to pre-simulation state! Incredibly faithful feature!
    if (undoStack.current.length > 0) {
      const lastBackup = undoStack.current.pop()!;
      try {
        const parsed = JSON.parse(lastBackup) as Record<string, RobloxInstance>;
        setInstances(parsed);
        addLog('Simulation stopped. Reverted workspace changes.', 'success');
      } catch (err) {
        addLog('Simulation stopped. Error restoring backup.', 'error');
      }
    }
  }, [simulationState, stopScripts, addLog]);

  // Reset/Restart Simulation
  const resetSimulation = useCallback(() => {
    if (simulationState === 'Stopped') return;
    stopSimulation();
    setTimeout(() => {
      startSimulation('Running');
    }, 200);
  }, [simulationState, stopSimulation, startSimulation]);

  // Physics Ticker Loop
  useEffect(() => {
    if (simulationState === 'Stopped') return;

    const gravity = 18.0; // studs/sec^2 (Roblox gravity is around 196.2, but 18 works better for our visual scale!)
    const tickRate = 30; // 30 fps
    const dt = 1 / tickRate;

    const interval = setInterval(() => {
      setInstances((prev) => {
        const next = { ...prev };
        let stateChanged = false;

        const parts = (Object.values(next) as RobloxInstance[]).filter(
          (inst) => (inst.className === 'Part' || inst.className === 'SpawnLocation') && inst.id !== 'Baseplate'
        );

        parts.forEach((part) => {
          const anchored = part.properties.Anchored || false;
          if (anchored) return; // Ignore anchored parts

          const size = part.properties.Size || { x: 4, y: 4, z: 4 };
          const pos = part.properties.Position || { x: 0, y: 0, z: 0 };
          
          // Let's attach a temporary vertical velocity inside the properties or keep a virtual one.
          // For simplicity, we can calculate gravity directly:
          let vy = (part.properties as any)._vy || 0;
          vy -= gravity * dt;

          let newY = pos.y + vy * dt;
          let landed = false;

          // 1. Baseplate Ground Collision
          const baseplate = next['Baseplate'];
          if (baseplate) {
            const baseplateY = baseplate.properties.Position?.y || -0.5;
            const baseplateSizeY = baseplate.properties.Size?.y || 1;
            const groundLimit = baseplateY + baseplateSizeY / 2 + size.y / 2;

            if (newY <= groundLimit) {
              newY = groundLimit;
              vy = 0;
              landed = true;
            }
          }

          // 2. Part-on-Part simple stacking collision (when collisions are enabled)
          if (collisionsEnabled && !landed) {
            parts.forEach((other) => {
              if (other.id === part.id) return;

              const oPos = other.properties.Position || { x: 0, y: 0, z: 0 };
              const oSize = other.properties.Size || { x: 4, y: 4, z: 4 };

              // Check X-Z overlap
              const halfSizeX = size.x / 2;
              const halfSizeZ = size.z / 2;
              const oHalfSizeX = oSize.x / 2;
              const oHalfSizeZ = oSize.z / 2;

              const overlapX = Math.abs(pos.x - oPos.x) < (halfSizeX + oHalfSizeX);
              const overlapZ = Math.abs(pos.z - oPos.z) < (halfSizeZ + oHalfSizeZ);

              if (overlapX && overlapZ) {
                // Check if we are landing on top of the other part
                const topLimit = oPos.y + oSize.y / 2 + size.y / 2;
                if (pos.y >= topLimit && newY <= topLimit + 0.1) {
                  newY = topLimit;
                  vy = 0;
                  landed = true;
                }
              }
            });
          }

          // Update position and virtual velocity if they changed
          if (pos.y !== newY || vy !== (part.properties as any)._vy) {
            stateChanged = true;
            next[part.id] = {
              ...part,
              properties: {
                ...part.properties,
                Position: { ...pos, y: newY },
                _vy: vy,
              } as any,
            };
          }
        });

        return stateChanged ? next : prev;
      });
    }, dt * 1000);

    return () => clearInterval(interval);
  }, [simulationState, collisionsEnabled]);

  // Execute single Command Console input
  const executeCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    addLog(`> ${cmd}`, 'info');

    // Simple command parser for common instructions
    const trimmed = cmd.trim();

    try {
      // 1. print("hello")
      if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
        const arg = trimmed.slice(6, -1);
        addLog(arg.replace(/['"]/g, ''), 'info');
        return;
      }

      // 2. Instance.new("Part")
      if (trimmed.includes('Instance.new(')) {
        const match = trimmed.match(/Instance\.new\s*\(\s*['"](\w+)['"]\s*\)/);
        if (match && match[1]) {
          const className = match[1] as InstanceClass;
          addInstance(className, 'Workspace');
          return;
        }
      }

      // 3. game.Workspace.PartName.Color = "hex" or similar
      if (trimmed.startsWith('game.')) {
        // We can execute direct JS commands on instances using a simple eval!
        // To make it safe and working, we build an evaluation bridge
        const jsCmd = transpileLuaToJS(trimmed);
        
        // Assemble environment
        const run = new Function(
          'instances',
          'updateProps',
          'addInstance',
          `
          const Workspace = {
            Part: {
              set Color(c) {
                // Find first Part in Workspace
                const part = Object.values(instances).find(p => p.className === 'Part' && p.parentId === 'Workspace');
                if (part) updateProps(part.id, { Color: c });
              },
              set Size(s) {
                const part = Object.values(instances).find(p => p.className === 'Part' && p.parentId === 'Workspace');
                if (part) updateProps(part.id, { Size: s });
              },
              set Anchored(a) {
                const part = Object.values(instances).find(p => p.className === 'Part' && p.parentId === 'Workspace');
                if (part) updateProps(part.id, { Anchored: a });
              }
            }
          };
          const game = { Workspace };
          
          try {
            ${jsCmd}
          } catch(e) {
            throw e;
          }
          `
        );

        run(instancesRef.current, updateInstanceProperties, addInstance);
        addLog('Command executed successfully.', 'success');
        return;
      }

      // Fallback: evaluate basic JavaScript in the context of our Workspace
      // Let them run direct JS statements like: addInstance("Part", "Workspace")
      const runJS = new Function(
        'addInstance',
        'deleteInstance',
        'instances',
        'updateProps',
        `try {
          const result = ${trimmed};
          return result;
        } catch(e) {
          return eval("${trimmed.replace(/"/g, '\\"')}");
        }`
      );

      const res = runJS(
        (cls: InstanceClass) => addInstance(cls, 'Workspace'),
        deleteInstance,
        instancesRef.current,
        updateInstanceProperties
      );

      if (res !== undefined) {
        addLog(String(res), 'info');
      } else {
        addLog('Command executed successfully.', 'success');
      }
    } catch (err: any) {
      addLog(`Command Error: ${err.message}`, 'error');
    }
  }, [addInstance, deleteInstance, updateInstanceProperties, addLog]);

  // Reset everything back to a clean plate
  const resetEverything = useCallback(() => {
    saveToHistory();
    setInstances(createDefaultInstances());
    setSelectedInstanceId(null);
    setOpenScripts([]);
    setActiveScriptInstanceId(null);
    setViewportTab('Viewport');
    addLog('Workspace reset to clean Baseplate template.', 'success');
  }, [saveToHistory, addLog]);

  // Group selection under a new Model
  const groupSelected = useCallback(() => {
    if (!selectedInstanceId) {
      addLog('No part selected to group.', 'warn');
      return;
    }
    const selected = instancesRef.current[selectedInstanceId];
    if (!selected || selected.parentId === null) return;

    saveToHistory();
    const modelId = generateId();
    const modelInstance: RobloxInstance = {
      id: modelId,
      name: 'Model',
      className: 'Model',
      parentId: selected.parentId,
      properties: {
        Name: 'Model',
        ClassName: 'Model',
      },
    };

    setInstances((prev) => {
      const next = { ...prev };
      next[modelId] = modelInstance;
      // Re-parent the selected item under the model
      next[selectedInstanceId] = {
        ...selected,
        parentId: modelId,
      };
      return next;
    });

    setSelectedInstanceId(modelId);
    setExpandedInstanceIds((prev) => {
      const next = new Set(prev);
      next.add(modelId);
      return next;
    });
    addLog(`Grouped instance '${selected.name}' inside a new Model.`, 'success');
  }, [selectedInstanceId, saveToHistory, addLog]);

  // Ungroup children of Model/Folder
  const ungroupSelected = useCallback(() => {
    if (!selectedInstanceId) {
      addLog('No Model or Folder selected to ungroup.', 'warn');
      return;
    }
    const model = instancesRef.current[selectedInstanceId];
    if (!model || (model.className !== 'Model' && model.className !== 'Folder')) {
      addLog('Selected instance is not a Model or Folder.', 'warn');
      return;
    }

    const targetParentId = model.parentId || 'Workspace';

    saveToHistory();
    setInstances((prev) => {
      const next = { ...prev };
      // Move all children of the Model up to the Model's parent
      (Object.values(prev) as RobloxInstance[]).forEach((inst) => {
        if (inst.parentId === selectedInstanceId) {
          next[inst.id] = {
            ...inst,
            parentId: targetParentId,
          };
        }
      });
      // Delete the Model
      delete next[selectedInstanceId];
      return next;
    });

    setSelectedInstanceId(null);
    addLog(`Ungrouped '${model.name}' and reparented all children.`, 'success');
  }, [selectedInstanceId, saveToHistory, addLog]);

  // Lock selected part
  const lockSelected = useCallback(() => {
    if (!selectedInstanceId) return;
    updateInstanceProperties(selectedInstanceId, { Locked: true });
    setSelectedInstanceId(null);
    addLog('Selected part is locked. Double-click in Explorer to unlock.', 'info');
  }, [selectedInstanceId, updateInstanceProperties, addLog]);

  // Unlock all parts
  const unlockAll = useCallback(() => {
    saveToHistory();
    setInstances((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].properties.Locked) {
          next[id] = {
            ...next[id],
            properties: {
              ...next[id].properties,
              Locked: false,
            },
          };
        }
      });
      return next;
    });
    addLog('Unlocked all parts in the workspace.', 'success');
  }, [saveToHistory, addLog]);

  // Load a map preset
  const loadSampleTemplate = useCallback((templateName: string) => {
    saveToHistory();
    const defaults = createDefaultInstances();
    
    if (templateName === 'Classic Obby') {
      const steps = [
        { name: 'SpawnPlatform', pos: { x: 0, y: 0.25, z: 0 }, size: { x: 6, y: 0.5, z: 6 }, color: '#3A3F44' },
        { name: 'Red Step', pos: { x: 0, y: 2, z: -10 }, size: { x: 4, y: 1, z: 4 }, color: '#FF3B30' },
        { name: 'Orange Step', pos: { x: 5, y: 4, z: -18 }, size: { x: 3, y: 1, z: 3 }, color: '#FF9500' },
        { name: 'Yellow Step', pos: { x: 1, y: 6, z: -26 }, size: { x: 3, y: 1, z: 3 }, color: '#FFCC00' },
        { name: 'Green Beam', pos: { x: -6, y: 8, z: -34 }, size: { x: 1.5, y: 1, z: 8 }, color: '#4CD964' },
        { name: 'Blue Spinner', pos: { x: -6, y: 10, z: -46 }, size: { x: 4, y: 1, z: 4 }, color: '#5AC8FA' },
        { name: 'Purple Neon Platform', pos: { x: 2, y: 12, z: -56 }, size: { x: 6, y: 1, z: 6 }, color: '#AF52DE', material: 'Neon' },
      ];

      const next = { ...defaults };
      delete next.Baseplate;
      
      next['LavaFloor'] = {
        id: 'LavaFloor',
        name: 'LavaPlate',
        className: 'Part',
        parentId: 'Workspace',
        properties: {
          Name: 'LavaPlate',
          ClassName: 'Part',
          Color: '#FF3B30',
          Material: 'Neon',
          Size: { x: 120, y: 1, z: 120 },
          Position: { x: 0, y: -20, z: -25 },
          Rotation: { x: 0, y: 0, z: 0 },
          Anchored: true,
        },
      };

      steps.forEach((s, idx) => {
        const id = `obby-${idx}`;
        next[id] = {
          id,
          name: s.name,
          className: s.name === 'SpawnPlatform' ? 'SpawnLocation' : 'Part',
          parentId: 'Workspace',
          properties: {
            Name: s.name,
            ClassName: s.name === 'SpawnPlatform' ? 'SpawnLocation' : 'Part',
            Color: s.color,
            Material: (s.material as any) || 'Plastic',
            Size: s.size,
            Position: s.pos,
            Rotation: { x: 0, y: 0, z: 0 },
            Anchored: true,
          },
        };
      });

      const scriptId = 'lava-script';
      next[scriptId] = {
        id: scriptId,
        name: 'KillScript',
        className: 'Script',
        parentId: 'Workspace',
        properties: {
          Name: 'KillScript',
          ClassName: 'Script',
          Source: `-- Obby Lava Kill Script
local lava = workspace.LavaPlate

while true do
    task.wait(1)
    print("Obby active... watch your step!")
end
`,
          Enabled: true,
        },
      };

      setInstances(next);
      addLog('Loaded "Classic Obby" gameplay template successfully!', 'success');
    } else if (templateName === 'Combat Arena') {
      const next = { ...defaults };
      
      next.Baseplate.properties.Color = '#4A4D52';
      next.Baseplate.properties.Material = 'Slate';
      next.Baseplate.properties.Size = { x: 120, y: 1, z: 120 };

      const walls = [
        { name: 'NorthWall', pos: { x: 0, y: 5, z: -60 }, size: { x: 120, y: 10, z: 4 } },
        { name: 'SouthWall', pos: { x: 0, y: 5, z: 60 }, size: { x: 120, y: 10, z: 4 } },
        { name: 'WestWall', pos: { x: -60, y: 5, z: 0 }, size: { x: 4, y: 10, z: 120 } },
        { name: 'EastWall', pos: { x: 60, y: 5, z: 0 }, size: { x: 4, y: 10, z: 120 } },
      ];

      walls.forEach((w, idx) => {
        const id = `wall-${idx}`;
        next[id] = {
          id,
          name: w.name,
          className: 'Part',
          parentId: 'Workspace',
          properties: {
            Name: w.name,
            ClassName: 'Part',
            Color: '#7A8086',
            Material: 'Brick',
            Size: w.size,
            Position: w.pos,
            Rotation: { x: 0, y: 0, z: 0 },
            Anchored: true,
          },
        };
      });

      for (let i = 0; i < 4; i++) {
        const id = `pillar-${i}`;
        const px = (i % 2 === 0 ? 1 : -1) * 20;
        const pz = (i < 2 ? 1 : -1) * 20;
        next[id] = {
          id,
          name: `Pillar-${i + 1}`,
          className: 'Part',
          parentId: 'Workspace',
          properties: {
            Name: `Pillar-${i + 1}`,
            ClassName: 'Part',
            Color: '#E2E8F0',
            Material: 'Slate',
            Size: { x: 4, y: 15, z: 4 },
            Position: { x: px, y: 7.5, z: pz },
            Rotation: { x: 0, y: 0, z: 0 },
            Anchored: true,
          },
        };
      }

      setInstances(next);
      addLog('Loaded "Combat Arena" fortress map template!', 'success');
    } else if (templateName === 'City Template') {
      const next = { ...defaults };
      
      next.Baseplate.properties.Color = '#1A1C1E';
      next.Baseplate.properties.Material = 'Slate';
      next.Baseplate.properties.Size = { x: 150, y: 1, z: 150 };

      const buildings = [
        { name: 'Skyscraper A', pos: { x: -25, y: 25, z: -25 }, size: { x: 15, y: 50, z: 15 }, color: '#1E293B', mat: 'Glass' },
        { name: 'Skyscraper B', pos: { x: 25, y: 35, z: -25 }, size: { x: 18, y: 70, z: 18 }, color: '#0F172A', mat: 'Glass' },
        { name: 'CyberTower', pos: { x: 0, y: 40, z: 30 }, size: { x: 10, y: 80, z: 10 }, color: '#111827', mat: 'Neon' },
        { name: 'Residential Block', pos: { x: -35, y: 15, z: 25 }, size: { x: 20, y: 30, z: 15 }, color: '#D1D5DB', mat: 'Brick' },
      ];

      buildings.forEach((b, idx) => {
        const id = `bldg-${idx}`;
        next[id] = {
          id,
          name: b.name,
          className: 'Part',
          parentId: 'Workspace',
          properties: {
            Name: b.name,
            ClassName: 'Part',
            Color: b.color,
            Material: b.mat as any,
            Size: b.size,
            Position: b.pos,
            Rotation: { x: 0, y: 0, z: 0 },
            Anchored: true,
          },
        };
      });

      setInstances(next);
      addLog('Loaded "City Template" skyline successfully!', 'success');
    } else {
      setInstances(defaults);
      addLog('Loaded "Baseplate" standard template.', 'success');
    }
    
    setSelectedInstanceId(null);
    setOpenScripts([]);
    setActiveScriptInstanceId(null);
    setViewportTab('Viewport');
  }, [saveToHistory, addLog]);

  // Import Roblox .rbxm / .rbxl / .rbxmx / .rbxlx files
  const importRobloxFile = useCallback((fileData: ArrayBuffer | string, fileName: string) => {
    saveToHistory();
    try {
      const { instances: parsed, isPlace } = parseRobloxFile(fileData);
      
      if (parsed.length === 0) {
        addLog(`No valid instances found in ${fileName}.`, 'warn');
        return;
      }

      if (isPlace) {
        // It's a complete Place (DataModel / .rbxl / .rbxlx)
        const defaults = createDefaultInstances();
        const next = { ...defaults };

        // Clean out existing children of root services
        const serviceIds = ['Workspace', 'Players', 'Lighting', 'MaterialService', 'ReplicatedStorage', 'ServerScriptService', 'ServerStorage', 'StarterGui', 'StarterPack', 'StarterPlayer'];
        
        // Find service mappings
        const parsedServices = parsed.filter(inst => serviceIds.includes(inst.className));
        
        const idMapping: Record<string, string> = {};
        parsedServices.forEach(srv => {
          idMapping[srv.id] = srv.className;
          if (next[srv.className]) {
            next[srv.className].properties = {
              ...next[srv.className].properties,
              ...srv.properties
            };
          }
        });

        const nonServiceInstances = parsed.filter(inst => !serviceIds.includes(inst.className));

        // Generate unique IDs for all incoming instances to prevent collision with our existing system
        nonServiceInstances.forEach(inst => {
          idMapping[inst.id] = `imported-${inst.className}-${generateId()}`;
        });

        // Add non-service instances to our new state
        nonServiceInstances.forEach(inst => {
          const newId = idMapping[inst.id];
          if (!newId) return;

          let newParentId: string | null = null;
          if (inst.parentId && idMapping[inst.parentId]) {
            newParentId = idMapping[inst.parentId];
          } else {
            if (inst.className === 'Part' || inst.className === 'SpawnLocation' || inst.className === 'Folder' || inst.className === 'Model') {
              newParentId = 'Workspace';
            } else {
              if (inst.className === 'Script' || inst.className === 'LocalScript') {
                newParentId = 'ServerScriptService';
              } else {
                newParentId = 'Workspace';
              }
            }
          }

          next[newId] = {
            ...inst,
            id: newId,
            parentId: newParentId,
            properties: {
              ...inst.properties,
              Name: inst.name,
              ClassName: inst.className,
            }
          };
        });

        setInstances(next);
        setSelectedInstanceId(null);
        setOpenScripts([]);
        setActiveScriptInstanceId(null);
        setViewportTab('Viewport');
        addLog(`Successfully loaded Place: "${fileName}" with ${parsed.length} instances!`, 'success');

      } else {
        // It's a Model (.rbxm / .rbxmx)
        let targetParentId = 'Workspace';
        if (selectedInstanceId) {
          const selInst = instancesRef.current[selectedInstanceId];
          if (selInst && (selInst.className === 'Workspace' || selInst.className === 'Folder' || selInst.className === 'Model')) {
            targetParentId = selectedInstanceId;
          }
        }

        const idMapping: Record<string, string> = {};
        
        const parsedIds = new Set(parsed.map(i => i.id));
        const roots = parsed.filter(inst => !inst.parentId || !parsedIds.has(inst.parentId));

        roots.forEach(root => {
          const newId = `imported-${root.className}-${generateId()}`;
          idMapping[root.id] = newId;
        });

        const nonRoots = parsed.filter(inst => !roots.includes(inst));
        nonRoots.forEach(inst => {
          idMapping[inst.id] = `imported-${inst.className}-${generateId()}`;
        });

        setInstances((prev) => {
          const next = { ...prev };

          parsed.forEach(inst => {
            const newId = idMapping[inst.id];
            if (!newId) return;

            let newParentId: string | null = null;
            if (roots.includes(inst)) {
              newParentId = targetParentId;
            } else if (inst.parentId && idMapping[inst.parentId]) {
              newParentId = idMapping[inst.parentId];
            } else {
              newParentId = targetParentId;
            }

            next[newId] = {
              ...inst,
              id: newId,
              parentId: newParentId,
              properties: {
                ...inst.properties,
                Name: inst.name,
                ClassName: inst.className,
              }
            };

            if (newParentId) {
              setExpandedInstanceIds((prevExpanded) => {
                const nextExpanded = new Set(prevExpanded);
                nextExpanded.add(newParentId);
                return nextExpanded;
              });
            }
          });

          return next;
        });

        if (roots.length > 0) {
          const firstNewId = idMapping[roots[0].id];
          if (firstNewId) {
            setSelectedInstanceId(firstNewId);
          }
        }

        addLog(`Successfully imported Model: "${fileName}" containing ${parsed.length} instances!`, 'success');
      }

    } catch (err: any) {
      addLog(`Failed to parse ${fileName}: ${err.message || err}`, 'error');
      console.error(err);
    }
  }, [saveToHistory, selectedInstanceId, addLog, setSelectedInstanceId, setOpenScripts, setActiveScriptInstanceId, setViewportTab, setInstances, setExpandedInstanceIds]);

  return {
    instances,
    selectedInstanceId,
    setSelectedInstanceId,
    expandedInstanceIds,
    toggleExpanded,
    activeTab,
    setActiveTab,
    activeTool,
    setActiveTool,
    gridSnapEnabled,
    setGridSnapEnabled,
    gridSnapSize,
    setGridSnapSize,
    rotateSnapEnabled,
    setRotateSnapEnabled,
    rotateSnapAngle,
    setRotateSnapAngle,
    simulationState,
    startSimulation,
    stopSimulation,
    resetSimulation,
    outputLogs,
    clearLogs,
    addLog,
    executeCommand,
    openScripts,
    activeScriptInstanceId,
    setActiveScriptInstanceId,
    viewportTab,
    setViewportTab,
    openScript,
    closeScriptTab,
    addInstance,
    updateInstanceProperties,
    deleteInstance,
    duplicateInstance,
    undo,
    redo,
    showGrid,
    setShowGrid,
    wireframe,
    setWireframe,
    showUi,
    setShowUi,
    materialFillMode,
    setMaterialFillMode,
    colorFillMode,
    setColorFillMode,
    activeColor,
    setActiveColor,
    activeMaterial,
    setActiveMaterial,
    collisionsEnabled,
    setCollisionsEnabled,
    joinSurfacesEnabled,
    setJoinSurfacesEnabled,
    resetEverything,
    groupSelected,
    ungroupSelected,
    lockSelected,
    unlockAll,
    loadSampleTemplate,
    importRobloxFile,
  };
}
