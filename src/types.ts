/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InstanceClass =
  | 'Workspace'
  | 'Players'
  | 'Lighting'
  | 'MaterialService'
  | 'ReplicatedStorage'
  | 'ServerScriptService'
  | 'ServerStorage'
  | 'StarterGui'
  | 'StarterPack'
  | 'StarterPlayer'
  | 'Part'
  | 'SpawnLocation'
  | 'Script'
  | 'LocalScript'
  | 'Folder'
  | 'Model';

export type PartShape = 'Block' | 'Sphere' | 'Wedge' | 'Cylinder';

export type PartMaterial =
  | 'Plastic'
  | 'SmoothPlastic'
  | 'Neon'
  | 'Wood'
  | 'Slate'
  | 'Glass'
  | 'Grass'
  | 'Brick'
  | 'Metal';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface RobloxInstance {
  id: string;
  name: string;
  className: InstanceClass;
  parentId: string | null;
  rawProperties?: Record<string, any>;
  properties: {
    // Common properties
    Name?: string;
    ClassName?: string;
    
    // Part / SpawnLocation properties
    Color?: string; // Hex color string, e.g., "#5A5D64"
    Material?: PartMaterial;
    Size?: Vector3;
    Position?: Vector3;
    Rotation?: Vector3;
    Anchored?: boolean;
    CanCollide?: boolean;
    Transparency?: number; // 0 to 1
    Reflectance?: number; // 0 to 1
    Shape?: PartShape;
    Locked?: boolean;

    // Script properties
    Source?: string;
    Enabled?: boolean;

    // Lighting properties
    Ambient?: string;
    Brightness?: number;
    TimeOfDay?: string; // e.g. "14:00:00"
    GlobalShadows?: boolean;
  };
}

export interface LogMessage {
  id: string;
  text: string;
  type: 'info' | 'warn' | 'error' | 'success';
  timestamp: string;
}

export interface OpenScriptTab {
  instanceId: string;
  name: string;
}

export type StudioTab = 'Home' | 'Model' | 'Avatar' | 'Test' | 'View' | 'Plugins' | 'UI';

export type ActiveTool = 'Select' | 'Move' | 'Scale' | 'Rotate';

export interface StudioState {
  instances: Record<string, RobloxInstance>;
  selectedInstanceId: string | null;
  expandedInstanceIds: Set<string>;
  activeTab: StudioTab;
  activeTool: ActiveTool;
  gridSnapEnabled: boolean;
  gridSnapSize: number; // in studs, e.g., 1, 0.25, 2, 4
  rotateSnapEnabled: boolean;
  rotateSnapAngle: number; // in degrees, e.g., 45, 90, 5
  simulationState: 'Stopped' | 'Playing' | 'Running';
  outputLogs: LogMessage[];
  openScripts: OpenScriptTab[];
  activeScriptInstanceId: string | null; // Currently viewed script in editor, null means viewing Viewport
  viewportTab: 'Viewport' | 'Script'; // whether center is script or viewport
  showGrid: boolean;
  wireframe: boolean;
  showUi: boolean;
  materialFillMode: boolean;
  colorFillMode: boolean;
  activeColor: string;
  activeMaterial: PartMaterial;
  collisionsEnabled: boolean;
  joinSurfacesEnabled: boolean;
}
