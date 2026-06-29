/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode,
  Folder,
  Save,
  Download,
  Info,
  HelpCircle,
  Play,
  Square,
  Sparkles,
  Wind,
  Laptop,
  Check,
  X,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Settings,
  Flame,
  Wrench,
  BookOpen,
  Compass,
  MessageSquare,
  Award
} from 'lucide-react';
import { RobloxInstance } from '../types';
import { exportToRobloxXml } from '../utils/robloxExporter';

interface MenuBarProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
  emulatorDevice: string | null;
  setEmulatorDevice: (device: string | null) => void;
  emulatorOrientation: 'portrait' | 'landscape';
  setEmulatorOrientation: (orientation: 'portrait' | 'landscape') => void;
  showWindControl: boolean;
  setShowWindControl: (show: boolean) => void;
  windSpeed: number;
  setWindSpeed: (speed: number) => void;
  windDirection: number;
  setWindDirection: (direction: number) => void;
  tourStep: number | null;
  setTourStep: (step: number | null) => void;
  installedPlugins: string[];
  setInstalledPlugins: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function MenuBar({
  state,
  emulatorDevice,
  setEmulatorDevice,
  emulatorOrientation,
  setEmulatorOrientation,
  showWindControl,
  setShowWindControl,
  windSpeed,
  setWindSpeed,
  windDirection,
  setWindDirection,
  tourStep,
  setTourStep,
  installedPlugins,
  setInstalledPlugins,
}: MenuBarProps) {
  const {
    instances,
    selectedInstanceId,
    setSelectedInstanceId,
    simulationState,
    startSimulation,
    stopSimulation,
    resetSimulation,
    undo,
    redo,
    addInstance,
    updateInstanceProperties,
    duplicateInstance,
    deleteInstance,
    addLog,
    clearLogs,
    showGrid,
    setShowGrid,
    wireframe,
    setWireframe,
    showUi,
    setShowUi,
    resetEverything,
    groupSelected,
    ungroupSelected,
    lockSelected,
    unlockAll,
    loadSampleTemplate,
    importRobloxFile,
  } = state;

  // Menu Dropdown Open States
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result) {
        importRobloxFile(result, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Modals Open States
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showGameSettingsModal, setShowGameSettingsModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showAssetManagerModal, setShowAssetManagerModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showAiMaterialModal, setShowAiMaterialModal] = useState(false);
  const [showPluginMarketModal, setShowPluginMarketModal] = useState(false);

  // Submenu states
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);

  // Settings form states
  const [placeName, setPlaceName] = useState('My Awesome Roblox Place');
  const [placeDesc, setPlaceDesc] = useState('Built with precision in the Roblox Studio Web Simulator.');
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [avatarType, setAvatarType] = useState<'R6' | 'R15'>('R15');
  const [physicsRate, setPhysicsRate] = useState<'Default' | 'Adaptive' | 'Fixed'>('Default');
  const [studioTheme, setStudioTheme] = useState<'Dark' | 'Light'>('Dark');

  // AI Material state
  const [aiPrompt, setAiPrompt] = useState('Glossy futuristic obsidian tile');
  const [aiMaterialBase, setAiMaterialBase] = useState<'Slate' | 'Glass' | 'Metal' | 'Neon'>('Glass');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Docs search state
  const [docsSearch, setDocsSearch] = useState('');
  const [selectedDocClass, setSelectedDocClass] = useState<string>('Part');

  // Local Save Slots for Version History
  const [saveSlots, setSaveSlots] = useState<{ id: string; name: string; timestamp: string; size: number }[]>([
    { id: '1', name: 'Initial Baseplate Backup', timestamp: '2026-06-28 10:00 AM', size: 12 },
    { id: '2', name: 'Terrain Setup', timestamp: '2026-06-28 12:45 PM', size: 34 },
    { id: '3', name: 'Main Scripting Save', timestamp: '2026-06-28 03:20 PM', size: 55 },
  ]);

  // Asset Manager simulated database
  const [assets, setAssets] = useState<{ id: string; name: string; type: 'Image' | 'Audio' | 'Mesh'; size: string; rbxId: string }[]>([
    { id: 'a1', name: 'Lava_Texture', type: 'Image', size: '240 KB', rbxId: 'rbxassetid://1048573' },
    { id: 'a2', name: 'Background_Music', type: 'Audio', size: '3.1 MB', rbxId: 'rbxassetid://9082736' },
    { id: 'a3', name: 'SciFi_Sword_Mesh', type: 'Mesh', size: '1.2 MB', rbxId: 'rbxassetid://4958201' },
    { id: 'a4', name: 'Coin_Pickup_SFX', type: 'Audio', size: '110 KB', rbxId: 'rbxassetid://2837492' },
  ]);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<'Image' | 'Audio' | 'Mesh'>('Image');

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setHoveredSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    if (openMenu) {
      setOpenMenu(menu);
    } else {
      setOpenMenu(menu);
    }
  };

  const handleMenuHover = (menu: string) => {
    if (openMenu) {
      setOpenMenu(menu);
      setHoveredSubmenu(null);
    }
  };

  const triggerAction = (actionName: string, actionFn?: () => void) => {
    setOpenMenu(null);
    setHoveredSubmenu(null);
    if (actionFn) {
      actionFn();
    } else {
      addLog(`Triggered action: '${actionName}'`, 'info');
    }
  };

  // Clipboard operations
  const clipboardRef = useRef<RobloxInstance | null>(null);

  const handleCopy = () => {
    if (selectedInstanceId) {
      const selected = instances[selectedInstanceId];
      if (selected) {
        clipboardRef.current = JSON.parse(JSON.stringify(selected));
        addLog(`Copied '${selected.name}' to Roblox virtual clipboard.`, 'info');
      }
    } else {
      addLog('No part selected to copy.', 'warn');
    }
  };

  const handleCut = () => {
    if (selectedInstanceId) {
      const selected = instances[selectedInstanceId];
      if (selected) {
        clipboardRef.current = JSON.parse(JSON.stringify(selected));
        deleteInstance(selectedInstanceId);
        setSelectedInstanceId(null);
        addLog(`Cut '${selected.name}' to virtual clipboard.`, 'info');
      }
    } else {
      addLog('No part selected to cut.', 'warn');
    }
  };

  const handlePaste = (parentId = 'Workspace') => {
    if (clipboardRef.current) {
      const original = clipboardRef.current;
      const newId = 'paste_' + Math.random().toString(36).substr(2, 5);
      const clonedProps = JSON.parse(JSON.stringify(original.properties)) as RobloxInstance['properties'];

      // Offset position slightly if it has one
      if (clonedProps.Position) {
        clonedProps.Position.x += 4;
        clonedProps.Position.z += 4;
      }
      clonedProps.Name = `${original.name} (Pasted)`;

      const pastedInstance: RobloxInstance = {
        id: newId,
        name: clonedProps.Name,
        className: original.className,
        parentId,
        properties: clonedProps,
      };

      instances[newId] = pastedInstance;
      setSelectedInstanceId(newId);
      addLog(`Pasted copy as '${pastedInstance.name}' into ${parentId}.`, 'success');
    } else {
      addLog('Clipboard is empty. Copy or Cut an instance first.', 'warn');
    }
  };

  // Simulated export
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(instances, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${placeName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addLog(`Exported place JSON successfully: '${placeName}'`, 'success');
  };

  const handleExportRbxl = () => {
    try {
      const xml = exportToRobloxXml(instances, null, true);
      const dataStr = 'data:text/xml;charset=utf-8,' + encodeURIComponent(xml);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${placeName.replace(/\s+/g, '_') || 'place'}.rbxl`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addLog(`Exported Roblox Place file successfully: '${placeName}.rbxl'`, 'success');
    } catch (err: any) {
      addLog(`Failed to export Place file: ${err.message}`, 'error');
    }
  };

  const handleExportRbxm = () => {
    try {
      if (!selectedInstanceId) {
        addLog('No instance selected to export. Please select an object in the Explorer tree first.', 'warn');
        alert('Please select an instance in the Explorer tree to export as a .rbxm model.');
        return;
      }
      const selected = instances[selectedInstanceId];
      const xml = exportToRobloxXml(instances, selectedInstanceId, false);
      const dataStr = 'data:text/xml;charset=utf-8,' + encodeURIComponent(xml);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${selected.name.replace(/\s+/g, '_') || 'model'}.rbxm`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addLog(`Exported Roblox Model file successfully: '${selected.name}.rbxm'`, 'success');
    } catch (err: any) {
      addLog(`Failed to export Model file: ${err.message}`, 'error');
    }
  };

  // Simulated manual save slot creation
  const handleSaveAsSlot = () => {
    const slotName = prompt('Enter a name for this backup slot:', `Save Slot #${saveSlots.length + 1}`);
    if (slotName) {
      const newSlot = {
        id: Math.random().toString(),
        name: slotName,
        timestamp: new Date().toLocaleString(),
        size: Math.round(JSON.stringify(instances).length / 1024),
      };
      setSaveSlots([newSlot, ...saveSlots]);
      addLog(`Saved place to backup slot: '${slotName}'`, 'success');
    }
  };

  // Simulate prompt-based AI material generation
  const handleAiMaterialGenerate = () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    addLog(`Generating custom AI texture for prompt: "${aiPrompt}"...`, 'info');

    setTimeout(() => {
      setAiGenerating(false);
      setShowAiMaterialModal(false);

      if (selectedInstanceId) {
        const inst = instances[selectedInstanceId];
        if (inst && (inst.className === 'Part' || inst.className === 'SpawnLocation')) {
          // Change the material properties and give it a fun color
          updateInstanceProperties(selectedInstanceId, {
            Material: aiMaterialBase as any,
            Color: aiMaterialBase === 'Neon' ? '#FF00FF' : '#334155',
            Name: `${inst.name}_AI_${aiMaterialBase}`,
          });
          addLog(`Success! Material generated and applied to '${inst.name}'.`, 'success');
        } else {
          addLog('Generated AI material saved! (Select a Part to apply)', 'success');
        }
      } else {
        addLog('AI Material created successfully and saved to MaterialService.', 'success');
      }
    }, 2000);
  };

  // Class definitions for Help Docs
  const docClasses: Record<string, { desc: string; properties: string[]; methods: string[]; example: string }> = {
    Workspace: {
      desc: 'The Workspace service contains all 3D environment instances, parts, and active physics. Anything that appears in the 3D scene must be parented under Workspace.',
      properties: ['Gravity: number (default 196.2 studs/s²)', 'Terrain: Terrain', 'CurrentCamera: Camera'],
      methods: ['GetPartsInPart(part: BasePart): Array<BasePart>', 'Raycast(origin: Vector3, direction: Vector3): RaycastResult'],
      example: `-- Change workspace gravity
workspace.Gravity = 100
print("Lighter physics enabled!")`,
    },
    Part: {
      desc: 'BasePart represents standard geometric rigid physical solids. Supported shapes include Blocks, Spheres, Wedges, and Cylinders.',
      properties: ['Size: Vector3', 'Position: Vector3', 'Color: Color3', 'Anchored: boolean', 'CanCollide: boolean', 'Transparency: number (0.0 to 1.0)'],
      methods: ['Destroy()', 'Clone(): Instance', 'GetTouchingParts(): Array<BasePart>'],
      example: `-- Spawn and anchor a neon blue brick
local part = Instance.new("Part")
part.Size = Vector3.new(4, 4, 4)
part.Position = Vector3.new(0, 10, 0)
part.Color = Color3.fromRGB(0, 162, 255)
part.Material = Enum.Material.Neon
part.Anchored = true
part.Parent = workspace`,
    },
    Script: {
      desc: 'Lua environment scripts run server-side. Scripts automatically begin execution on game boot or once they are parented to Workspace or ServerScriptService.',
      properties: ['Source: string (The Lua source code)', 'Enabled: boolean (Whether execution is active)'],
      methods: ['Destroy()'],
      example: `-- Infinite loop printing a clock message
while true do
    print("Simulated time: " .. os.date("%H:%M:%S"))
    task.wait(1.5)
end`,
    },
    Lighting: {
      desc: 'The Lighting service determines global environmental lighting settings, skyboxes, and atmospheric shadows.',
      properties: ['Ambient: Color3', 'Brightness: number', 'TimeOfDay: string (HH:MM:SS format)', 'ClockTime: number', 'GlobalShadows: boolean'],
      methods: ['GetSunDirection(): Vector3'],
      example: `-- Progress to golden twilight sunset
game.Lighting.TimeOfDay = "17:30:00"
game.Lighting.Brightness = 1.2
game.Lighting.Ambient = Color3.fromRGB(120, 80, 70)`,
    },
  };

  const currentDoc = docClasses[selectedDocClass] || docClasses.Part;

  return (
    <div
      ref={menuBarRef}
      className="bg-[#1C1D1F] border-b border-[#121315] text-gray-300 px-3 py-1.5 flex items-center justify-between font-sans text-xs select-none relative z-50 h-9"
      id="desktop-menubar"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".rbxm,.rbxl,.rbxmx,.rbxlx"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Horizontal List of Top-Level Menu Buttons */}
      <div className="flex items-center gap-1">
        {/* Roblox Studio Minimal square logo icon */}
        <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center transform rotate-12 mr-3 border border-red-500 shadow shadow-red-900 select-none pointer-events-none">
          <span className="text-white font-black text-[9px] transform -rotate-12">R</span>
        </div>

        {/* Menu Buttons */}
        {[
          { name: 'File', key: 'file' },
          { name: 'Edit', key: 'edit' },
          { name: 'View', key: 'view' },
          { name: 'Plugins', key: 'plugins' },
          { name: 'Test', key: 'test' },
          { name: 'Window', key: 'window' },
          { name: 'Help', key: 'help' },
        ].map((menu) => {
          const isCurrent = openMenu === menu.key;
          return (
            <div key={menu.key} className="relative">
              <button
                onClick={() => handleMenuClick(menu.key)}
                onMouseEnter={() => handleMenuHover(menu.key)}
                className={`px-3 py-1 rounded transition text-[11px] font-medium cursor-pointer ${
                  isCurrent
                    ? 'bg-[#007ACC] text-white'
                    : 'text-gray-300 hover:bg-[#2D3035] hover:text-white'
                }`}
                id={`menu-btn-${menu.key}`}
              >
                {menu.name}
              </button>

              {/* Dropdown Box */}
              {isCurrent && (
                <div className="absolute top-7 left-0 bg-[#24262A] border border-[#141517] shadow-2xl rounded-md py-1 min-w-[210px] text-gray-200 z-[100] animate-in fade-in duration-75">
                  
                  {/* FILE DROPDOWN */}
                  {menu.key === 'file' && (
                    <>
                      <button onClick={() => triggerAction('New', resetEverything)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span className="flex items-center gap-2">📄 New Place</span>
                        <span className="text-[9px] text-gray-500 group-hover:text-white">Ctrl+N</span>
                      </button>
                      <button onClick={() => triggerAction('Open', () => setShowVersionHistoryModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span className="flex items-center gap-2">📂 Open Place...</span>
                        <span className="text-[9px] text-gray-500">Ctrl+O</span>
                      </button>
                      <button onClick={() => triggerAction('Import Roblox File', () => fileInputRef.current?.click())} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center gap-2 text-yellow-400 font-bold transition cursor-pointer">
                        <span>📦 Import Roblox File (.rbxm/.rbxl)...</span>
                      </button>

                      {/* Submenu for Recents */}
                      <div
                        onMouseEnter={() => setHoveredSubmenu('recents')}
                        onMouseLeave={() => setHoveredSubmenu(null)}
                        className="relative w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">🕒 Recent Templates</span>
                        <ChevronRight size={12} className="text-gray-500" />

                        {hoveredSubmenu === 'recents' && (
                          <div className="absolute top-0 left-[208px] bg-[#24262A] border border-[#141517] shadow-xl rounded-md py-1 min-w-[160px] text-gray-200 z-[101]">
                            {['Classic Obby', 'Combat Arena', 'City Template'].map((t) => (
                              <button
                                key={t}
                                onClick={() => triggerAction(`Load ${t}`, () => loadSampleTemplate(t))}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white text-xs block truncate cursor-pointer"
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Close', resetEverything)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        🚪 Close Place
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      
                      <button onClick={() => triggerAction('Mesh Importer', () => {
                        const mName = prompt('Enter a name for the 3D Mesh asset to import:', 'SciFi_Crate');
                        if (mName) {
                          const customMeshId = 'rbxassetid://' + Math.floor(1000000 + Math.random() * 9000000);
                          setAssets([...assets, { id: 'a' + Date.now(), name: mName, type: 'Mesh', size: '1.4 MB', rbxId: customMeshId }]);
                          addLog(`Mesh Imported: '${mName}' loaded successfully as ${customMeshId}`, 'success');
                          setShowAssetManagerModal(true);
                        }
                      })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        📐 Mesh Importer...
                      </button>
                      
                      <button onClick={() => triggerAction('Export Place (.rbxl)', handleExportRbxl)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer text-yellow-400 font-bold">
                        <span>📤 Export Place (.rbxl)</span>
                      </button>
                      <button onClick={() => triggerAction('Export Selected Model (.rbxm)', handleExportRbxm)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer text-blue-400 font-bold">
                        <span>📦 Export Selected (.rbxm)</span>
                      </button>
                      <button onClick={() => triggerAction('Export Place', handleExportJSON)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer text-gray-400">
                        <span>📄 Export Place as JSON</span>
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Save', () => { addLog('Successfully saved workspace locally to state.', 'success'); })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span className="flex items-center gap-2">💾 Save Place</span>
                        <span className="text-[9px] text-gray-500">Ctrl+S</span>
                      </button>
                      <button onClick={() => triggerAction('Save As', handleSaveAsSlot)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        💾 Save Place As...
                      </button>
                      <button onClick={() => triggerAction('Publish', () => {
                        addLog(`Publishing Place to Roblox Cloud. Complete!`, 'success');
                        alert(`Successfully Published "${placeName}" to Roblox!`);
                      })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        ☁️ Publish to Roblox
                      </button>
                      <button onClick={() => triggerAction('Download Copy (.rbxl)', handleExportRbxl)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer text-yellow-400 font-bold">
                        <span>📥 Download .rbxl Place Copy</span>
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Game Settings', () => setShowGameSettingsModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        ⚙️ Game Settings...
                      </button>
                      <button onClick={() => triggerAction('Studio Settings', () => setShowSettingsModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        🛠️ Studio Settings...
                      </button>
                      <button onClick={() => triggerAction('Shortcuts Help', () => setShowShortcutsModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        ⌨️ Shortcuts Cheatsheet...
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('About', () => setShowAboutModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        ℹ️ About Roblox Studio...
                      </button>
                    </>
                  )}

                  {/* EDIT DROPDOWN */}
                  {menu.key === 'edit' && (
                    <>
                      <button onClick={() => triggerAction('Undo', undo)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>↩️ Undo</span>
                        <span className="text-[9px] text-gray-500">Ctrl+Z</span>
                      </button>
                      <button onClick={() => triggerAction('Redo', redo)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>🔁 Redo</span>
                        <span className="text-[9px] text-gray-500">Ctrl+Y</span>
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Cut', handleCut)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>✂️ Cut</span>
                        <span className="text-[9px] text-gray-500">Ctrl+X</span>
                      </button>
                      <button onClick={() => triggerAction('Copy', handleCopy)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>📋 Copy</span>
                        <span className="text-[9px] text-gray-500">Ctrl+C</span>
                      </button>
                      <button onClick={() => triggerAction('Paste', () => handlePaste())} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>📋 Paste</span>
                        <span className="text-[9px] text-gray-500">Ctrl+V</span>
                      </button>
                      <button onClick={() => triggerAction('Paste Into', () => {
                        if (selectedInstanceId) {
                          handlePaste(selectedInstanceId);
                        } else {
                          addLog('Select an instance to paste into.', 'warn');
                        }
                      })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        📋 Paste Into Selected
                      </button>
                      <button onClick={() => triggerAction('Duplicate', () => { if (selectedInstanceId) duplicateInstance(selectedInstanceId); })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>👥 Duplicate</span>
                        <span className="text-[9px] text-gray-500">Ctrl+D</span>
                      </button>
                      <button onClick={() => triggerAction('Delete', () => { if (selectedInstanceId) deleteInstance(selectedInstanceId); })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>🗑️ Delete Selected</span>
                        <span className="text-[9px] text-gray-500">Del</span>
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Group', groupSelected)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>📦 Group into Model</span>
                        <span className="text-[9px] text-gray-500">Ctrl+G</span>
                      </button>
                      <button onClick={() => triggerAction('Ungroup', ungroupSelected)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>📦 Ungroup Model</span>
                        <span className="text-[9px] text-gray-500">Ctrl+U</span>
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Lock', lockSelected)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        🔒 Lock Selected
                      </button>
                      <button onClick={() => triggerAction('Unlock All', unlockAll)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        🔓 Unlock All Workspace Parts
                      </button>
                      <button onClick={() => triggerAction('Select All', () => { setSelectedInstanceId('Workspace'); addLog('Selected hierarchy parent node Workspace.', 'info'); })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>Select All Workspace</span>
                        <span className="text-[9px] text-gray-500">Ctrl+A</span>
                      </button>
                    </>
                  )}

                  {/* VIEW DROPDOWN */}
                  {menu.key === 'view' && (
                    <>
                      <button onClick={() => triggerAction('Grid Toggle', () => setShowGrid(!showGrid))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>🗺️ Show 3D Grid</span>
                        {showGrid && <Check size={12} className="text-green-500" />}
                      </button>
                      <button onClick={() => triggerAction('Wireframe', () => setWireframe(!wireframe))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>🕸️ Wireframe Mode</span>
                        {wireframe && <Check size={12} className="text-green-500" />}
                      </button>
                      <button onClick={() => triggerAction('UI Visibility', () => setShowUi(!showUi))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>👁️ Toggle Viewport UI Overlays</span>
                        {showUi && <Check size={12} className="text-green-500" />}
                      </button>

                      <hr className="border-[#1A1C1F] my-1" />
                      <div className="px-3 py-1.5 text-gray-500 font-bold uppercase text-[9px] tracking-wider">Grid Snapping Size</div>
                      {[0.25, 1, 4, 16].map((snap) => (
                        <button
                          key={snap}
                          onClick={() => triggerAction(`Set grid snap ${snap}`, () => { state.setGridSnapSize(snap); state.setGridSnapEnabled(true); })}
                          className="w-full text-left px-4 py-1 hover:bg-[#007ACC] hover:text-white flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span>📏 {snap} {snap === 1 ? 'Stud' : 'Studs'}</span>
                          {state.gridSnapEnabled && state.gridSnapSize === snap && <Check size={11} className="text-green-500" />}
                        </button>
                      ))}
                      <button onClick={() => triggerAction('Disable Snapping', () => state.setGridSnapEnabled(!state.gridSnapEnabled))} className="w-full text-left px-4 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between text-xs border-t border-[#1D1E22] cursor-pointer">
                        <span>No Snap (Freeform)</span>
                        {!state.gridSnapEnabled && <Check size={11} className="text-green-500" />}
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Wind Control', () => setShowWindControl(!showWindControl))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span className="flex items-center gap-2"><Wind size={12} /> Global Wind Control</span>
                        {showWindControl && <Check size={12} className="text-green-500" />}
                      </button>
                    </>
                  )}

                  {/* PLUGINS DROPDOWN */}
                  {menu.key === 'plugins' && (
                    <>
                      <button onClick={() => triggerAction('Plugin Market', () => setShowPluginMarketModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center gap-2 transition cursor-pointer">
                        🔌 Manage & Install Plugins...
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <div className="px-3 py-1 text-gray-500 font-bold uppercase text-[9px] tracking-wider">Installed Plugins ({installedPlugins.length})</div>
                      {installedPlugins.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500 italic text-[11px]">No active plugins installed. Open Manager to add.</div>
                      ) : (
                        installedPlugins.map((plug) => (
                          <div key={plug} className="px-3 py-1.5 text-gray-200 bg-[#1D1E22]/50 border-y border-[#18191B] flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-blue-400">⚡ {plug}</span>
                            <span className="text-[9px] bg-green-950 text-green-400 border border-green-900 px-1 rounded">Active</span>
                          </div>
                        ))
                      )}
                      
                      {installedPlugins.includes('Building Tools by F3X') && (
                        <button onClick={() => triggerAction('F3X Quick Build', () => {
                          const id = addInstance('Part', 'Workspace', { Size: { x: 5, y: 5, z: 5 }, Material: 'SmoothPlastic', Color: '#10B981', Name: 'F3X_Cube' });
                          addLog(`F3X Quick Build spawned block Part ID '${id}'`, 'success');
                        })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white text-xs text-yellow-500 font-bold border-t border-[#1D1E22] cursor-pointer">
                          ⚡ Use F3X: Quick Spawn Part
                        </button>
                      )}
                    </>
                  )}

                  {/* TEST DROPDOWN */}
                  {menu.key === 'test' && (
                    <>
                      {simulationState === 'Stopped' ? (
                        <>
                          <button onClick={() => triggerAction('Play F5', () => startSimulation('Playing'))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                            <span className="flex items-center gap-2">▶️ Play Solo</span>
                            <span className="text-[9px] text-gray-500">F5</span>
                          </button>
                          <button onClick={() => triggerAction('Play from Camera', () => startSimulation('Playing'))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                            <span>▶️ Play from Camera</span>
                            <span className="text-[9px] text-gray-500">F6</span>
                          </button>
                          <button onClick={() => triggerAction('Run F7', () => startSimulation('Running'))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                            <span>🧪 Run (Server-Only Physics)</span>
                            <span className="text-[9px] text-gray-500">F7</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => triggerAction('Stop', stopSimulation)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                            <span className="flex items-center gap-2">⏹️ Stop Simulation</span>
                            <span className="text-[9px] text-gray-500">Shift+F5</span>
                          </button>
                          <button onClick={() => triggerAction('Reset Sim', resetSimulation)} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                            🔄 Reset World Simulation
                          </button>
                        </>
                      )}
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Device Emulator', () => setEmulatorDevice(emulatorDevice ? null : 'iPhone 15 Pro'))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span className="flex items-center gap-2"><Laptop size={12} /> Device Emulator Frame</span>
                        {emulatorDevice && <span className="text-[10px] text-green-400">ON</span>}
                      </button>
                    </>
                  )}

                  {/* WINDOW DROPDOWN */}
                  {menu.key === 'window' && (
                    <>
                      <button onClick={() => triggerAction('Toggle Asset Manager', () => setShowAssetManagerModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>🗂️ Asset Manager...</span>
                      </button>
                      <button onClick={() => triggerAction('Toggle Version History', () => setShowVersionHistoryModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center justify-between transition cursor-pointer">
                        <span>🕒 Place Version History...</span>
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('AI Material Gen', () => setShowAiMaterialModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center gap-1.5 transition text-purple-400 font-bold cursor-pointer">
                        <Sparkles size={12} /> AI Material Generator...
                      </button>
                      <hr className="border-[#1A1C1F] my-1" />
                      <button onClick={() => triggerAction('Reset View', () => {
                        setSelectedInstanceId(null);
                        state.setViewportTab('Viewport');
                        addLog('Reset layout docks to default settings.', 'success');
                      })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        🔄 Reset Default Layout Panels
                      </button>
                    </>
                  )}

                  {/* HELP DROPDOWN */}
                  {menu.key === 'help' && (
                    <>
                      <button onClick={() => triggerAction('Docs', () => setShowDocsModal(true))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center gap-2 transition cursor-pointer">
                        <BookOpen size={12} /> Creator Docs & API Search...
                      </button>
                      <button onClick={() => triggerAction('Tutorials', () => alert('Welcome! Select "Recent Templates" -> "Classic Obby" to see a live playable obby example. Write custom scripts and click "Run" to test!'))} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        🎓 Studio Guided Tutorials
                      </button>
                      <button onClick={() => triggerAction('DevForum', () => {
                        alert('Roblox DevForum Community Feed (Simulated):\n\n1. [Updates] Adaptive Physics Step Released!\n2. [Help] How do I raycast from a cylinder Part?\n3. [Release] AI Material Generator is now live in Studio!');
                      })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white flex items-center transition cursor-pointer">
                        💬 Roblox Developer Forum
                      </button>
                      <button onClick={() => triggerAction('Tour', () => { setTourStep(0); })} className="w-full text-left px-3 py-1.5 hover:bg-[#007ACC] hover:text-white text-yellow-400 font-bold flex items-center gap-1.5 transition cursor-pointer">
                        <Award size={12} /> Launch Studio Guide Tour...
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Side: Place Name & Online Stat */}
      <div className="flex items-center gap-3">
        <div className="text-[10px] text-gray-500 font-mono tracking-tight select-none">
          {placeName} • Saved Locally
        </div>
        <div className="flex items-center gap-1.5 bg-[#25282D] px-2.5 py-0.5 rounded border border-gray-800 text-[10px] text-gray-400 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>Online IDE</span>
        </div>
      </div>

      {/* ================= MODALS & OVERLAYS CONTAINER ================= */}

      {/* 1. ABOUT ROBLOX STUDIO MODAL */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[440px] rounded-lg shadow-2xl overflow-hidden font-sans text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">About Roblox Studio Clone</span>
              <button onClick={() => setShowAboutModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center transform rotate-12 border border-red-500 shadow-xl shadow-red-950/40">
                <span className="text-white font-black text-3xl transform -rotate-12 select-none">R</span>
              </div>
              <div>
                <h3 className="font-black text-base text-white tracking-wide">ROBLOX STUDIO</h3>
                <p className="text-gray-500 mt-0.5 text-[10px] font-mono">Version 1.0.0 (Web Build)</p>
              </div>
              <p className="text-gray-300 leading-relaxed text-[11px]">
                This is a fully-featured, ultra-polished 3D sandbox IDE mimicking the visual look, feel, and features of the official Roblox Studio ribbon editor interface. Includes 3D rendering with Three.js, active Lua-to-JS script execution engine, hierachical scene graph tree, and details inspector!
              </p>
              <div className="w-full bg-[#141517] p-3 rounded border border-gray-800 font-mono text-[9px] text-gray-400 text-left leading-normal flex flex-col gap-1">
                <div>• Renderer: WebGL ThreeJS context</div>
                <div>• Lua Script Transpiler: Active sandbox</div>
                <div>• Client User: {navigator.userAgent.slice(0, 40)}...</div>
                <div>• Environment: Google AI Studio Sandbox</div>
              </div>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end">
              <button onClick={() => setShowAboutModal(false)} className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-1.5 rounded cursor-pointer transition">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. GAME SETTINGS MODAL */}
      {showGameSettingsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[500px] rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">🛠️ Game Settings - {placeName}</span>
              <button onClick={() => setShowGameSettingsModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4 max-h-[400px] overflow-y-auto">
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-semibold">Game Title</label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="bg-[#24262A] border border-gray-800 rounded p-2 text-white font-medium outline-none focus:border-blue-500 font-sans"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-semibold">Description</label>
                <textarea
                  value={placeDesc}
                  rows={2}
                  onChange={(e) => setPlaceDesc(e.target.value)}
                  className="bg-[#24262A] border border-gray-800 rounded p-2 text-white font-medium outline-none focus:border-blue-500 font-sans resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-semibold">Max Players</label>
                  <input
                    type="number"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="bg-[#24262A] border border-gray-800 rounded p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-semibold">Avatar Type</label>
                  <select
                    value={avatarType}
                    onChange={(e) => setAvatarType(e.target.value as any)}
                    className="bg-[#24262A] border border-gray-800 rounded p-2 text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="R6">Classic R6 (6 Joint Parts)</option>
                    <option value="R15">Modern R15 (15 Joint Parts)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-semibold">Physics Solver Step Rate</label>
                <select
                  value={physicsRate}
                  onChange={(e) => setPhysicsRate(e.target.value as any)}
                  className="bg-[#24262A] border border-gray-800 rounded p-2 text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Default">Default (60Hz Solver)</option>
                  <option value="Adaptive">Adaptive (Throttle inactive physics)</option>
                  <option value="Fixed">Fixed High Precision (240Hz Solver)</option>
                </select>
              </div>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end gap-2">
              <button onClick={() => setShowGameSettingsModal(false)} className="border border-gray-800 hover:bg-gray-800 px-4 py-1.5 rounded cursor-pointer transition text-gray-300">Cancel</button>
              <button onClick={() => {
                setShowGameSettingsModal(false);
                addLog(`Updated Game Settings! Solver: ${physicsRate}, Rig: ${avatarType}`, 'success');
              }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-1.5 rounded cursor-pointer transition">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SHORTCUTS MODAL */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[480px] rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">⌨️ Roblox Studio Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcutsModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-4 bg-[#141517] font-mono text-[11px] flex flex-col gap-2.5 text-gray-300 max-h-[380px] overflow-y-auto">
              <div className="text-[#00A2FF] font-bold border-b border-gray-800 pb-1 mb-1 font-sans">Viewport Camera & Navigation</div>
              <div className="flex justify-between"><span>WASD keys</span> <span className="text-yellow-500">Pan camera horizontal</span></div>
              <div className="flex justify-between"><span>Q / E keys</span> <span className="text-yellow-500">Lower / Raise camera focus</span></div>
              <div className="flex justify-between"><span>Right-Click + Drag</span> <span className="text-yellow-500">Orbit / Look around</span></div>
              <div className="flex justify-between"><span>Scroll Wheel</span> <span className="text-yellow-500">Zoom in / Zoom out</span></div>
              <div className="flex justify-between"><span>F key</span> <span className="text-yellow-500">Focus on selected part</span></div>

              <div className="text-[#00A2FF] font-bold border-b border-gray-800 pb-1 mt-3 mb-1 font-sans">Instance Editing & Controls</div>
              <div className="flex justify-between"><span>Ctrl + N</span> <span className="text-yellow-500">Create new baseplate</span></div>
              <div className="flex justify-between"><span>Ctrl + D</span> <span className="text-yellow-500">Duplicate selected instance</span></div>
              <div className="flex justify-between"><span>Ctrl + Z / Ctrl + Y</span> <span className="text-yellow-500">Undo / Redo action</span></div>
              <div className="flex justify-between"><span>Ctrl + G / Ctrl + U</span> <span className="text-yellow-500">Group / Ungroup parts</span></div>
              <div className="flex justify-between"><span>Delete key</span> <span className="text-yellow-500">Delete selected instance</span></div>

              <div className="text-[#00A2FF] font-bold border-b border-gray-800 pb-1 mt-3 mb-1 font-sans">Testing & Simulations</div>
              <div className="flex justify-between"><span>F5 key</span> <span className="text-yellow-500">Start Play Solo test</span></div>
              <div className="flex justify-between"><span>F7 key</span> <span className="text-yellow-500">Run server simulation</span></div>
              <div className="flex justify-between"><span>Shift + F5</span> <span className="text-yellow-500">Stop simulation test</span></div>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end">
              <button onClick={() => setShowShortcutsModal(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded cursor-pointer transition">Got it!</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLACE VERSION HISTORY MODAL */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[520px] rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">🕒 Place Version History & Auto-Saves</span>
              <button onClick={() => setShowVersionHistoryModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <p className="text-gray-400">Roll back your workspace to any of the local saves or auto-saved milestones:</p>
              <div className="border border-gray-800 rounded bg-[#141517] overflow-hidden">
                <div className="grid grid-cols-3 bg-[#202124] p-2 text-gray-400 font-bold border-b border-gray-800">
                  <span>Version Milestone</span>
                  <span>Timestamp</span>
                  <span className="text-right">Action</span>
                </div>
                <div className="flex flex-col divide-y divide-gray-800 max-h-[220px] overflow-y-auto">
                  {saveSlots.map((slot) => (
                    <div key={slot.id} className="grid grid-cols-3 p-2 text-gray-300 hover:bg-gray-800/40 items-center">
                      <span className="font-semibold text-blue-400">📁 {slot.name} ({slot.size} KB)</span>
                      <span className="font-mono text-[11px] text-gray-500">{slot.timestamp}</span>
                      <div className="text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to load version "${slot.name}"? Unsaved changes will be lost.`)) {
                              addLog(`Successfully loaded backup slot: '${slot.name}'`, 'success');
                              setShowVersionHistoryModal(false);
                            }
                          }}
                          className="bg-[#2C2D31] hover:bg-blue-600 border border-gray-700 hover:border-blue-500 hover:text-white text-gray-300 px-2 py-0.5 rounded text-[10px] cursor-pointer"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end">
              <button onClick={() => setShowVersionHistoryModal(false)} className="border border-gray-800 text-gray-400 hover:bg-gray-800 px-4 py-1.5 rounded cursor-pointer transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ASSET MANAGER MODAL */}
      {showAssetManagerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[550px] rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">🗂️ Roblox Asset Manager (Workspace Repository)</span>
              <button onClick={() => setShowAssetManagerModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {/* Asset Uploader Form */}
              <div className="bg-[#24262A] p-3 rounded border border-gray-800 flex gap-3 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Asset Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Grass_Texture"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="bg-[#1A1C1E] border border-gray-800 rounded p-1.5 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div className="w-[110px] flex flex-col gap-1">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Asset Type</label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value as any)}
                    className="bg-[#1A1C1E] border border-gray-800 rounded p-1.5 text-white outline-none cursor-pointer"
                  >
                    <option value="Image">🖼️ Image</option>
                    <option value="Audio">🎵 Audio</option>
                    <option value="Mesh">📐 3D Mesh</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!newAssetName.trim()) return;
                    const rbxId = 'rbxassetid://' + Math.floor(1000000 + Math.random() * 9000000);
                    setAssets([...assets, { id: 'asset-' + Date.now(), name: newAssetName, type: newAssetType, size: '200 KB', rbxId }]);
                    addLog(`Uploaded asset: '${newAssetName}' (${newAssetType}) -> ${rbxId}`, 'success');
                    setNewAssetName('');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-4 rounded cursor-pointer transition text-center"
                >
                  Upload File
                </button>
              </div>

              {/* Uploaded asset grid */}
              <div className="border border-gray-800 rounded bg-[#141517] max-h-[180px] overflow-y-auto">
                <div className="grid grid-cols-4 bg-[#202124] p-2 text-[10px] text-gray-400 font-bold border-b border-gray-800 uppercase tracking-wider">
                  <span>Asset Name</span>
                  <span>Type</span>
                  <span>Asset Link ID</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="flex flex-col divide-y divide-gray-800">
                  {assets.map((asset) => (
                    <div key={asset.id} className="grid grid-cols-4 p-2 text-gray-300 hover:bg-gray-800/40 items-center font-mono text-[11px]">
                      <span className="font-sans font-semibold text-gray-200 truncate">{asset.name}</span>
                      <span className="text-blue-400">{asset.type}</span>
                      <span className="text-yellow-500 truncate" title={asset.rbxId}>{asset.rbxId}</span>
                      <div className="text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(asset.rbxId);
                            addLog(`Copied Asset Link: ${asset.rbxId}`, 'info');
                          }}
                          className="bg-[#2C2D31] hover:bg-blue-600 text-gray-300 px-1.5 py-0.5 rounded text-[9px] cursor-pointer"
                        >
                          Copy URL
                        </button>
                        <button
                          onClick={() => {
                            setAssets(assets.filter((a) => a.id !== asset.id));
                            addLog(`Removed asset: '${asset.name}'`, 'info');
                          }}
                          className="text-red-500 hover:text-red-400 p-0.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end">
              <button onClick={() => setShowAssetManagerModal(false)} className="bg-[#2C2D31] text-gray-300 px-4 py-1.5 rounded cursor-pointer transition">Close Manager</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. HELP DOCS / API REFERENCE MODAL */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[640px] rounded-lg shadow-2xl overflow-hidden text-xs flex flex-col h-[460px]">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between shrink-0">
              <span className="font-bold text-gray-200 flex items-center gap-2">📕 Roblox Creator Documentation & API Reference</span>
              <button onClick={() => setShowDocsModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="flex-1 flex min-h-0 bg-[#141517]">
              {/* Sidebar: classes */}
              <aside className="w-[160px] border-r border-gray-800 bg-[#1A1C1E] flex flex-col py-2 shrink-0">
                <div className="px-3 pb-2 border-b border-gray-800">
                  <input
                    type="text"
                    placeholder="Search Classes..."
                    value={docsSearch}
                    onChange={(e) => setDocsSearch(e.target.value)}
                    className="w-full bg-[#24262A] border border-gray-800 rounded px-2 py-1 text-[10px] outline-none text-white focus:border-blue-500"
                  />
                </div>
                <div className="flex-1 overflow-y-auto mt-1 flex flex-col">
                  {Object.keys(docClasses)
                    .filter((cls) => cls.toLowerCase().includes(docsSearch.toLowerCase()))
                    .map((cls) => (
                      <button
                        key={cls}
                        onClick={() => setSelectedDocClass(cls)}
                        className={`text-left px-4 py-2 transition text-xs truncate cursor-pointer ${
                          selectedDocClass === cls
                            ? 'bg-[#007ACC] text-white font-bold'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        🧱 {cls}
                      </button>
                    ))}
                </div>
              </aside>

              {/* Main documentation page */}
              <main className="flex-1 p-5 overflow-y-auto text-gray-300 leading-relaxed font-sans text-[11px] flex flex-col gap-3">
                <div>
                  <h3 className="text-base font-black text-white">Class {selectedDocClass}</h3>
                  <p className="text-gray-400 mt-1">{currentDoc.desc}</p>
                </div>

                <div className="mt-2">
                  <div className="text-blue-400 font-bold border-b border-gray-800 pb-1 mb-1.5">Properties</div>
                  <div className="flex flex-col gap-1 pl-2">
                    {currentDoc.properties.map((p) => (
                      <div key={p} className="font-mono text-xs text-gray-200">• {p}</div>
                    ))}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-green-400 font-bold border-b border-gray-800 pb-1 mb-1.5">Methods</div>
                  <div className="flex flex-col gap-1 pl-2">
                    {currentDoc.methods.map((m) => (
                      <div key={m} className="font-mono text-xs text-gray-200">• {m}</div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex-1 min-h-0 flex flex-col">
                  <div className="text-yellow-500 font-bold border-b border-gray-800 pb-1 mb-1.5 flex items-center gap-1">
                    <FileCode size={11} /> Sample Script Usage
                  </div>
                  <pre className="bg-[#1C1D1F] border border-gray-800 p-3 rounded font-mono text-[10px] text-[#A6E22E] overflow-x-auto select-text">
                    {currentDoc.example}
                  </pre>
                </div>
              </main>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end shrink-0">
              <button onClick={() => setShowDocsModal(false)} className="bg-[#2C2D31] text-gray-300 px-4 py-1.5 rounded cursor-pointer transition">Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. AI MATERIAL GENERATOR MODAL */}
      {showAiMaterialModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[460px] rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200 flex items-center gap-1.5 text-purple-400">
                <Sparkles size={14} className="animate-spin" /> Gemini AI Texture & Material Generator
              </span>
              <button onClick={() => setShowAiMaterialModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-gray-400">Describe the physical appearance of the material texture you want to generate using server-side Gemini AI. It will generate physics maps and roughness profiles!</p>
              
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold">Describe Material Style</label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="bg-[#24262A] border border-gray-800 rounded p-2 text-white outline-none focus:border-purple-500 font-sans"
                  placeholder="e.g. Weathered rusty copper sheet metal plates"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold">Physical Base Template Material</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Slate', 'Glass', 'Metal', 'Neon'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setAiMaterialBase(m)}
                      className={`py-1.5 border rounded font-semibold text-center cursor-pointer transition ${
                        aiMaterialBase === m
                          ? 'bg-purple-900/30 border-purple-600 text-purple-300 shadow'
                          : 'bg-[#24262A] border-gray-800 hover:bg-gray-800 text-gray-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {aiGenerating ? (
                <div className="py-6 bg-[#141517] rounded border border-purple-950 flex flex-col items-center gap-2 justify-center">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-purple-400 font-mono animate-pulse">Running Gemini Image-to-Texture diffusion loops...</span>
                </div>
              ) : (
                <button
                  onClick={handleAiMaterialGenerate}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded cursor-pointer transition flex items-center justify-center gap-2 text-xs"
                >
                  <Sparkles size={12} /> Generate & Apply AI Material
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. COMMUNITY PLUGIN MARKET MODAL */}
      {showPluginMarketModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4 backdrop-blur-xs">
          <div className="bg-[#1C1D1F] border border-gray-700 w-full max-w-[540px] rounded-lg shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#232427] border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-gray-200">🔌 Roblox Studio Tool Marketplace / Plugins Manager</span>
              <button onClick={() => setShowPluginMarketModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <p className="text-gray-400">Install premium utility plugins built by the developer community to extend Roblox Studio functionalities:</p>
              
              <div className="flex flex-col divide-y divide-gray-800 border border-gray-800 rounded bg-[#141517] max-h-[250px] overflow-y-auto">
                {[
                  { name: 'Building Tools by F3X', desc: 'Surgical position, scaling, and rotation grabber tools. Overrides default gizmos.', installs: '4.2M+', author: 'G00D_Vibes' },
                  { name: 'Archimedes Two', desc: 'Allows automatically spawning parts along clean circular or curved path arcs.', installs: '1.8M+', author: 'Our_Hero' },
                  { name: 'GapFill', desc: 'Select any two part edges and this utility fills the gap with standard wedges.', installs: '2.5M+', author: 'Solitary_Coder' },
                  { name: 'Waterfall Generator', desc: 'Procedural particle emitter system that simulates flowing water bodies.', installs: '540K+', author: 'FluidSim_Dev' },
                ].map((plugin) => {
                  const isInstalled = installedPlugins.includes(plugin.name);
                  return (
                    <div key={plugin.name} className="p-3 flex items-center justify-between hover:bg-gray-800/20">
                      <div className="flex-1 pr-4">
                        <h4 className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                          ⚡ {plugin.name}
                          <span className="text-[9px] text-gray-500 font-normal">by @{plugin.author}</span>
                        </h4>
                        <p className="text-gray-400 text-[10px] mt-0.5">{plugin.desc}</p>
                        <div className="text-gray-500 text-[9px] mt-1 font-mono">Downloads: {plugin.installs}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (isInstalled) {
                            setInstalledPlugins(installedPlugins.filter((p) => p !== plugin.name));
                            addLog(`Uninstalled plugin: '${plugin.name}'`, 'info');
                          } else {
                            setInstalledPlugins([...installedPlugins, plugin.name]);
                            addLog(`Installed plugin: '${plugin.name}' successfully!`, 'success');
                          }
                        }}
                        className={`px-4 py-1.5 rounded font-bold cursor-pointer transition text-xs shrink-0 ${
                          isInstalled
                            ? 'bg-transparent border border-red-900 hover:bg-red-950/20 text-red-400'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                        }`}
                      >
                        {isInstalled ? 'Uninstall' : 'Install'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-4 py-3 bg-[#232427] border-t border-gray-800 flex justify-end">
              <button onClick={() => setShowPluginMarketModal(false)} className="bg-transparent text-gray-400 hover:bg-gray-800 border border-gray-800 px-4 py-1.5 rounded cursor-pointer transition">Close Marketplace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
