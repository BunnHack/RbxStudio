/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MousePointer,
  Move,
  Maximize,
  RotateCw,
  Play,
  Zap,
  Square,
  ChevronDown,
  Palette,
  Box,
  Layers,
  FolderArchive,
  Lock,
  Anchor,
  Settings,
  Undo2,
  Redo2,
  Tv,
  ListCollapse,
  Layers3,
  Combine,
  Scissors,
  Copy,
  Clipboard,
  SquareMinus,
  Spline,
  Terminal,
  Grid3X3,
  Eye,
  VolumeX,
  Volume2,
} from 'lucide-react';
import { StudioState, StudioTab, ActiveTool, PartMaterial, PartShape } from '../types';

interface RibbonBarProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

export default function RibbonBar({ state }: RibbonBarProps) {
  const {
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
    undo,
    redo,
    addInstance,
    updateInstanceProperties,
    addLog,
    clearLogs,
    showGrid,
    setShowGrid,
    wireframe,
    setWireframe,
    showUi,
    setShowUi,
    activeColor,
    setActiveColor,
    activeMaterial,
    setActiveMaterial,
    collisionsEnabled,
    setCollisionsEnabled,
    joinSurfacesEnabled,
    setJoinSurfacesEnabled,
    selectedInstanceId,
    duplicateInstance,
    deleteInstance,
  } = state;

  const [partMenuOpen, setPartMenuOpen] = useState(false);
  const [materialMenuOpen, setMaterialMenuOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  const materials: PartMaterial[] = [
    'Plastic',
    'SmoothPlastic',
    'Neon',
    'Wood',
    'Slate',
    'Glass',
    'Grass',
    'Brick',
    'Metal',
  ];

  const handleSpawnPart = (shape: PartShape) => {
    addInstance('Part', 'Workspace', { Shape: shape, Name: `${shape}Part` });
    setPartMenuOpen(false);
  };

  const handleSpawnScript = () => {
    if (selectedInstanceId) {
      addInstance('Script', selectedInstanceId);
    } else {
      addInstance('Script', 'Workspace');
    }
  };

  const handleDuplicate = () => {
    if (selectedInstanceId) {
      duplicateInstance(selectedInstanceId);
    }
  };

  const handleDelete = () => {
    if (selectedInstanceId) {
      deleteInstance(selectedInstanceId);
    }
  };

  return (
    <div id="studio-ribbon-bar" className="bg-[#2D3035] text-gray-200 border-b border-[#1E2024] select-none flex flex-col font-sans text-xs">
      {/* Top Title/Quick Access Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#222428] border-b border-[#1A1C1F]">
        {/* Quick Access Menu */}
        <div className="flex items-center gap-2">
          {/* Roblox Logo Placeholder */}
          <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center transform rotate-12 mr-2 border border-red-500 shadow shadow-red-900">
            <span className="text-white font-black text-[10px] transform -rotate-12">R</span>
          </div>
          
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className="px-2 py-0.5 rounded text-gray-300 hover:bg-[#3E4249] transition font-semibold"
          >
            File
          </button>
          
          <div className="h-4 w-[1px] bg-gray-700 mx-1"></div>

          <button onClick={undo} title="Undo (Ctrl+Z)" className="p-1 hover:bg-[#3E4249] rounded transition text-gray-400 hover:text-white">
            <Undo2 size={13} />
          </button>
          <button onClick={redo} title="Redo (Ctrl+Y)" className="p-1 hover:bg-[#3E4249] rounded transition text-gray-400 hover:text-white">
            <Redo2 size={13} />
          </button>
          
          <div className="h-4 w-[1px] bg-gray-700 mx-1"></div>

          {simulationState === 'Stopped' ? (
            <button onClick={() => startSimulation('Playing')} title="Play Solo (F5)" className="p-1 hover:bg-[#3E4249] rounded transition text-green-500 hover:text-green-400">
              <Play size={13} fill="currentColor" />
            </button>
          ) : (
            <button onClick={stopSimulation} title="Stop Simulation" className="p-1 hover:bg-[#3E4249] rounded transition text-red-500 hover:text-red-400">
              <Square size={13} fill="currentColor" />
            </button>
          )}
        </div>

        {/* Studio Window Label */}
        <div className="text-[10px] text-gray-500 font-mono tracking-tight select-none">
          Roblox Studio - Place1 [Development App]
        </div>

        {/* User profile identifier / settings summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* File Dropdown Menu */}
      {fileMenuOpen && (
        <div className="absolute top-7 left-12 bg-[#2D3035] border border-[#1E2024] shadow-xl rounded-b-md py-1 z-50 min-w-[200px] text-gray-300">
          <button onClick={() => { state.clearLogs(); setFileMenuOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] hover:text-white transition">
            New Place
          </button>
          <hr className="border-gray-700 my-1" />
          <button onClick={undo} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] hover:text-white transition flex justify-between">
            <span>Undo</span>
            <span className="text-gray-500">Ctrl+Z</span>
          </button>
          <button onClick={redo} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] hover:text-white transition flex justify-between">
            <span>Redo</span>
            <span className="text-gray-500">Ctrl+Y</span>
          </button>
          <hr className="border-gray-700 my-1" />
          <button onClick={() => { handleSpawnPart('Block'); setFileMenuOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] hover:text-white transition">
            Insert Block Part
          </button>
          <button onClick={() => { handleSpawnScript(); setFileMenuOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] hover:text-white transition">
            Insert Script
          </button>
          <hr className="border-gray-700 my-1" />
          <button onClick={() => { state.clearLogs(); addLog("Wiped sandbox Workspace back to defaults.", "info"); setFileMenuOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] text-red-400 hover:text-red-300 transition">
            Reset Everything
          </button>
          <button onClick={() => setFileMenuOpen(false)} className="w-full text-left px-4 py-1.5 hover:bg-[#3E4249] hover:text-white transition">
            Close Menu
          </button>
        </div>
      )}

      {/* Tab Navigation Headers */}
      <div className="flex gap-1 px-2 pt-1.5 bg-[#25282D] border-b border-[#1A1C1F]">
        {(['Home', 'Model', 'Test', 'View', 'Plugins'] as StudioTab[]).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              id={`ribbon-tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 text-xs rounded-t transition font-medium ${
                isSelected
                  ? 'bg-[#2D3035] text-white border-t border-l border-r border-[#1E2024] shadow-inner'
                  : 'text-gray-400 hover:bg-[#2A2E34] hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Ribbon Bar Controls Area */}
      <div className="h-20 bg-[#2D3035] p-1.5 flex gap-2 overflow-x-auto items-stretch select-none">
        
        {/* ==================== HOME TAB ==================== */}
        {activeTab === 'Home' && (
          <>
            {/* Clipboard Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-1.5 flex-1 items-center">
                <button onClick={handleDuplicate} title="Duplicate selection (Ctrl+D)" className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11">
                  <Copy size={16} />
                  <span className="text-[10px] mt-1 text-center scale-90">Duplicate</span>
                </button>
                <div className="flex flex-col gap-0.5 justify-center">
                  <button onClick={handleDelete} title="Delete selected instance" className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#3E4249] text-red-400 hover:text-red-300 text-[10px] transition">
                    <Scissors size={10} />
                    <span>Cut/Del</span>
                  </button>
                  <button onClick={() => addLog("Clipboard copy simulation is active.", "info")} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#3E4249] text-gray-400 text-[10px] transition">
                    <Clipboard size={10} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Clipboard</span>
            </div>

            {/* Tools Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-1 flex-1 items-center">
                {(['Select', 'Move', 'Scale', 'Rotate'] as ActiveTool[]).map((tool) => {
                  const isActive = activeTool === tool;
                  const iconsMap = {
                    Select: <MousePointer size={15} />,
                    Move: <Move size={15} />,
                    Scale: <Maximize size={15} />,
                    Rotate: <RotateCw size={15} />,
                  };
                  return (
                    <button
                      key={tool}
                      id={`tool-btn-${tool.toLowerCase()}`}
                      onClick={() => {
                        setActiveTool(tool);
                        addLog(`Active tool changed to: ${tool}`, 'info');
                      }}
                      title={`${tool} Tool`}
                      className={`flex flex-col items-center justify-center rounded p-1.5 transition h-12 w-11 ${
                        isActive
                          ? 'bg-[#007ACC] text-white font-medium border border-[#0092F2]'
                          : 'hover:bg-[#3E4249] text-gray-300 hover:text-white'
                      }`}
                    >
                      {iconsMap[tool]}
                      <span className="text-[9px] mt-1 select-none scale-90">{tool}</span>
                    </button>
                  );
                })}

                <div className="h-8 w-[1px] bg-gray-700 mx-1"></div>

                <div className="flex flex-col gap-0.5 justify-center">
                  <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={collisionsEnabled}
                      onChange={(e) => {
                        setCollisionsEnabled(e.target.checked);
                        addLog(`Collisions: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`, 'info');
                      }}
                      className="rounded accent-[#007ACC] bg-[#1E2024] border-gray-600 w-3 h-3 cursor-pointer"
                    />
                    <span>Collisions</span>
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={joinSurfacesEnabled}
                      onChange={(e) => {
                        setJoinSurfacesEnabled(e.target.checked);
                        addLog(`Join Surfaces: ${e.target.checked ? 'ENABLED' : 'DISABLED'}`, 'info');
                      }}
                      className="rounded accent-[#007ACC] bg-[#1E2024] border-gray-600 w-3 h-3 cursor-pointer"
                    />
                    <span>Join Surfaces</span>
                  </label>
                </div>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Tools</span>
            </div>

            {/* Insert Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-1.5 flex-1 items-center relative">
                {/* Part Menu Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setPartMenuOpen(!partMenuOpen)}
                    id="ribbon-btn-part"
                    className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-12 border border-transparent hover:border-gray-700"
                  >
                    <Box size={16} className="text-[#00A2FF]" />
                    <span className="text-[10px] mt-1 flex items-center select-none scale-90">
                      Part <ChevronDown size={8} className="ml-0.5" />
                    </span>
                  </button>

                  {partMenuOpen && (
                    <div className="absolute top-13 left-0 bg-[#222428] border border-[#1A1C1F] shadow-xl rounded py-1 z-50 min-w-[120px]">
                      <button onClick={() => handleSpawnPart('Block')} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition text-[11px]">
                        <span className="w-3 h-3 bg-gray-500 rounded-sm"></span>
                        Block
                      </button>
                      <button onClick={() => handleSpawnPart('Sphere')} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition text-[11px]">
                        <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                        Sphere
                      </button>
                      <button onClick={() => handleSpawnPart('Wedge')} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition text-[11px]">
                        <span className="w-3 h-3 bg-gray-500 clip-wedge"></span>
                        Wedge
                      </button>
                      <button onClick={() => handleSpawnPart('Cylinder')} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition text-[11px]">
                        <span className="w-2.5 h-3 bg-gray-500 rounded-md"></span>
                        Cylinder
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={handleSpawnScript} title="Insert basic server-script" className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-12">
                  <Terminal size={16} className="text-orange-400" />
                  <span className="text-[10px] mt-1 scale-90 select-none">Script</span>
                </button>

                <button 
                  onClick={state.toggleBaseplate} 
                  title={state.instances.Baseplate ? "Remove Baseplate" : "Insert Baseplate"} 
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-12"
                >
                  <Grid3X3 size={16} className={state.instances.Baseplate ? "text-green-400" : "text-gray-500"} />
                  <span className="text-[10px] mt-1 scale-90 select-none leading-none truncate text-center w-full">
                    {state.instances.Baseplate ? "Rem Base" : "Add Base"}
                  </span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Insert</span>
            </div>

            {/* Import Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2" id="home-ribbon-import">
              <div className="flex gap-1.5 flex-1 items-center">
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.rbxm,.rbxl,.rbxmx,.rbxlx';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result;
                        if (result) {
                          state.importRobloxFile(result, file.name);
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    };
                    input.click();
                  }}
                  title="Upload and import Roblox Model (.rbxm) or Place (.rbxl) files"
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-yellow-400 hover:text-yellow-300 font-bold transition h-12 w-12 cursor-pointer"
                >
                  <FolderArchive size={16} className="text-yellow-400" />
                  <span className="text-[10px] mt-1 scale-90 select-none">Import</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none font-mono">Roblox File</span>
            </div>

            {/* Edit Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-2 flex-1 items-center">
                {/* Color Palette Picker */}
                <div className="flex flex-col items-center">
                  <label title="Choose Part color" className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white cursor-pointer h-12 w-11 transition">
                    <Palette size={16} style={{ color: activeColor }} />
                    <span className="text-[9px] mt-1 select-none scale-90">Color</span>
                    <input
                      type="color"
                      value={activeColor}
                      onChange={(e) => {
                        setActiveColor(e.target.value);
                        if (selectedInstanceId) {
                          updateInstanceProperties(selectedInstanceId, { Color: e.target.value });
                        }
                      }}
                      className="absolute opacity-0 w-0 h-0"
                    />
                  </label>
                </div>

                {/* Material Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setMaterialMenuOpen(!materialMenuOpen)}
                    className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-14 border border-transparent hover:border-gray-700"
                  >
                    <Layers size={16} className="text-yellow-400" />
                    <span className="text-[9px] mt-1 flex items-center select-none scale-90 leading-none">
                      Material <ChevronDown size={8} className="ml-0.5" />
                    </span>
                  </button>

                  {materialMenuOpen && (
                    <div className="absolute top-13 left-0 bg-[#222428] border border-[#1A1C1F] shadow-xl rounded py-1 z-50 min-w-[130px] max-h-[160px] overflow-y-auto">
                      {materials.map((mat) => (
                        <button
                          key={mat}
                          onClick={() => {
                            setActiveMaterial(mat);
                            if (selectedInstanceId) {
                              updateInstanceProperties(selectedInstanceId, { Material: mat });
                            }
                            setMaterialMenuOpen(false);
                            addLog(`Selected material: ${mat}`, 'info');
                          }}
                          className={`w-full text-left px-3 py-1 hover:bg-[#3E4249] text-[11px] transition ${
                            activeMaterial === mat ? 'text-yellow-400 font-semibold' : ''
                          }`}
                        >
                          {mat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Anchor Toggle */}
                <button
                  onClick={() => {
                    if (selectedInstanceId) {
                      const inst = state.instances[selectedInstanceId];
                      if (inst && (inst.className === 'Part' || inst.className === 'SpawnLocation')) {
                        const newAnchor = !inst.properties.Anchored;
                        updateInstanceProperties(selectedInstanceId, { Anchored: newAnchor });
                        addLog(`Part '${inst.name}' Anchored: ${newAnchor ? 'TRUE' : 'FALSE'}`, 'info');
                      }
                    } else {
                      addLog('Select a part to Anchor/Unanchor.', 'warn');
                    }
                  }}
                  className={`flex flex-col items-center justify-center rounded p-1.5 transition h-12 w-11 ${
                    selectedInstanceId && state.instances[selectedInstanceId]?.properties.Anchored
                      ? 'bg-[#3E4249] text-[#00A2FF] border border-[#00A2FF]'
                      : 'hover:bg-[#3E4249] text-gray-300 hover:text-white'
                  }`}
                >
                  <Anchor size={15} />
                  <span className="text-[9px] mt-1 select-none scale-90">Anchor</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Edit</span>
            </div>

            {/* Test Simulation Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-1.5 flex-1 items-center">
                {simulationState === 'Stopped' ? (
                  <>
                    <button
                      onClick={() => startSimulation('Playing')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-green-500 hover:text-green-400 transition h-12 w-11"
                    >
                      <Play size={16} fill="currentColor" />
                      <span className="text-[10px] mt-1 scale-90 select-none">Play</span>
                    </button>
                    <button
                      onClick={() => startSimulation('Running')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-yellow-500 hover:text-yellow-400 transition h-12 w-11"
                    >
                      <Zap size={16} fill="currentColor" />
                      <span className="text-[10px] mt-1 scale-90 select-none">Run</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={stopSimulation}
                    className="flex flex-col items-center justify-center p-1 rounded bg-[#3E2525] hover:bg-[#4E2D2D] text-red-500 hover:text-red-400 border border-red-900 transition h-12 w-16"
                  >
                    <Square size={16} fill="currentColor" />
                    <span className="text-[10px] mt-1 scale-90 font-bold select-none">Stop</span>
                  </button>
                )}
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Test</span>
            </div>

            {/* Settings Group */}
            <div className="flex flex-col items-center px-2">
              <div className="flex gap-1.5 flex-1 items-center">
                <button onClick={() => addLog("Game Settings panel is configured internally.", "info")} className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-16">
                  <Settings size={16} />
                  <span className="text-[9px] mt-1 text-center scale-90 select-none">Game Settings</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Settings</span>
            </div>
          </>
        )}

        {/* ==================== MODEL TAB ==================== */}
        {activeTab === 'Model' && (
          <>
            {/* Same Tools Group for fast access */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-1 flex-1 items-center">
                {(['Select', 'Move', 'Scale', 'Rotate'] as ActiveTool[]).map((tool) => {
                  const isActive = activeTool === tool;
                  const iconsMap = {
                    Select: <MousePointer size={14} />,
                    Move: <Move size={14} />,
                    Scale: <Maximize size={14} />,
                    Rotate: <RotateCw size={14} />,
                  };
                  return (
                    <button
                      key={tool}
                      onClick={() => {
                        setActiveTool(tool);
                        addLog(`Active tool changed to: ${tool}`, 'info');
                      }}
                      className={`flex flex-col items-center justify-center rounded p-1 transition h-11 w-11 ${
                        isActive
                          ? 'bg-[#007ACC] text-white'
                          : 'hover:bg-[#3E4249] text-gray-300'
                      }`}
                    >
                      {iconsMap[tool]}
                      <span className="text-[9px] mt-0.5 scale-90 select-none">{tool}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Tools</span>
            </div>

            {/* Snapping Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex flex-col gap-1 flex-1 justify-center text-[10px] text-gray-300">
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={rotateSnapEnabled}
                    onChange={(e) => setRotateSnapEnabled(e.target.checked)}
                    className="accent-[#007ACC] w-3 h-3 cursor-pointer"
                  />
                  <span>Rotate:</span>
                  <input
                    type="number"
                    value={rotateSnapAngle}
                    onChange={(e) => setRotateSnapAngle(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-12 bg-[#1E2024] border border-[#1A1C1F] px-1 rounded text-center text-white text-[10px] h-4"
                  />
                  <span className="text-[10px] text-gray-500">°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={gridSnapEnabled}
                    onChange={(e) => setGridSnapEnabled(e.target.checked)}
                    className="accent-[#007ACC] w-3 h-3 cursor-pointer"
                  />
                  <span>Move:</span>
                  <input
                    type="number"
                    step="0.25"
                    value={gridSnapSize}
                    onChange={(e) => setGridSnapSize(Math.max(0.05, parseFloat(e.target.value) || 0.1))}
                    className="w-12 bg-[#1E2024] border border-[#1A1C1F] px-1 rounded text-center text-white text-[10px] h-4"
                  />
                  <span className="text-[10px] text-gray-500">Studs</span>
                </div>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Snap Settings</span>
            </div>

            {/* Solid Modeling CSG Group */}
            <div className="flex flex-col items-center border-r border-gray-700 px-2">
              <div className="flex gap-1 flex-1 items-center">
                <button onClick={() => addLog("Union Operation: Connect parts together.", "info")} className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11">
                  <Combine size={15} />
                  <span className="text-[9px] mt-1 scale-90 select-none">Union</span>
                </button>
                <button onClick={() => addLog("Negate Operation: Subtracted mask area.", "info")} className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11">
                  <SquareMinus size={15} />
                  <span className="text-[9px] mt-1 scale-90 select-none">Negate</span>
                </button>
                <button onClick={() => addLog("Separate Operation: Released CSG part.", "info")} className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11">
                  <Spline size={15} />
                  <span className="text-[9px] mt-1 scale-90 select-none">Separate</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Solid Modeling</span>
            </div>

            {/* Spawn Part & Model Creation */}
            <div className="flex flex-col items-center px-2">
              <div className="flex gap-2 flex-1 items-center">
                <button
                  onClick={() => handleSpawnPart('Block')}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11"
                >
                  <Box size={16} className="text-[#00A2FF]" />
                  <span className="text-[9px] mt-1 scale-90 select-none">Spawn</span>
                </button>
                
                <button
                  onClick={() => {
                    if (selectedInstanceId) {
                      addLog(`Grouped selected instance in standard model hierarchy.`, 'info');
                    } else {
                      addLog(`Select a Workspace instance to create a Model group.`, 'warn');
                    }
                  }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11"
                >
                  <FolderArchive size={16} className="text-yellow-500" />
                  <span className="text-[9px] mt-1 scale-90 select-none">Group</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Structure</span>
            </div>

            {/* Model Import Group */}
            <div className="flex flex-col items-center px-2" id="model-ribbon-import">
              <div className="flex gap-1.5 flex-1 items-center">
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.rbxm,.rbxl,.rbxmx,.rbxlx';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result;
                        if (result) {
                          state.importRobloxFile(result, file.name);
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    };
                    input.click();
                  }}
                  title="Upload and import Roblox Model (.rbxm) or Place (.rbxl) files"
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-yellow-400 hover:text-yellow-300 font-bold transition h-12 w-12 cursor-pointer"
                >
                  <FolderArchive size={16} className="text-yellow-400" />
                  <span className="text-[10px] mt-1 scale-90 select-none">Import</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none font-mono">Roblox File</span>
            </div>
          </>
        )}

        {/* ==================== TEST TAB ==================== */}
        {activeTab === 'Test' && (
          <>
            {/* Play controls */}
            <div className="flex flex-col items-center border-r border-gray-700 px-3">
              <div className="flex gap-2 flex-1 items-center">
                {simulationState === 'Stopped' ? (
                  <>
                    <button
                      onClick={() => startSimulation('Playing')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-green-500 hover:text-green-400 transition h-12 w-12"
                    >
                      <Play size={16} fill="currentColor" />
                      <span className="text-[10px] mt-1 scale-90 select-none">Play Solo</span>
                    </button>
                    <button
                      onClick={() => startSimulation('Running')}
                      className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-yellow-500 hover:text-yellow-400 transition h-12 w-12"
                    >
                      <Zap size={16} fill="currentColor" />
                      <span className="text-[10px] mt-1 scale-90 select-none">Run Server</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={stopSimulation}
                    className="flex flex-col items-center justify-center p-1 rounded bg-[#3E2525] hover:bg-[#4E2D2D] text-red-500 border border-red-900 transition h-12 w-16"
                  >
                    <Square size={16} fill="currentColor" />
                    <span className="text-[10px] mt-1 scale-90 font-bold select-none">Stop</span>
                  </button>
                )}
                
                <button
                  disabled={simulationState === 'Stopped'}
                  onClick={resetSimulation}
                  className={`flex flex-col items-center justify-center p-1 rounded transition h-12 w-12 ${
                    simulationState === 'Stopped' ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-[#3E4249] text-blue-400'
                  }`}
                >
                  <Undo2 size={16} className="transform rotate-185" />
                  <span className="text-[10px] mt-1 scale-90 select-none">Reset</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Simulation</span>
            </div>

            {/* Clients & Servers */}
            <div className="flex flex-col items-center border-r border-gray-700 px-3">
              <div className="flex gap-2 flex-1 items-center text-[10px] text-gray-300">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span>Local Server:</span>
                    <select className="bg-[#1E2024] border border-[#1A1C1F] text-white px-1 py-0.5 rounded text-[10px]">
                      <option>None (Single Player)</option>
                      <option>1 Player</option>
                      <option>2 Players</option>
                    </select>
                  </div>
                  <button
                    onClick={() => addLog("Launched virtual server cluster.", "info")}
                    className="px-2 py-0.5 bg-[#3E4249] hover:bg-[#4E535C] rounded border border-gray-600 transition text-[9px]"
                  >
                    Start Server & Players
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Server/Client Test</span>
            </div>

            {/* Audio Toggle */}
            <div className="flex flex-col items-center px-3">
              <div className="flex gap-2 flex-1 items-center">
                <button
                  onClick={() => addLog("Muted audio assets in simulator.", "info")}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-11"
                >
                  <VolumeX size={15} />
                  <span className="text-[10px] mt-1 scale-90 select-none">Mute</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Audio</span>
            </div>
          </>
        )}

        {/* ==================== VIEW TAB ==================== */}
        {activeTab === 'View' && (
          <>
            {/* Show/Hide Toggles */}
            <div className="flex flex-col items-center border-r border-gray-700 px-3">
              <div className="flex gap-1.5 flex-1 items-center">
                <button
                  onClick={() => {
                    // Expand/collapse panels simulation
                    addLog("Toggled Core View. Use layout docks directly.", "info");
                  }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-12"
                >
                  <ListCollapse size={15} />
                  <span className="text-[10px] mt-1 scale-90 select-none">Explorer</span>
                </button>
                <button
                  onClick={() => {
                    addLog("Toggled Properties Panel.", "info");
                  }}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-12"
                >
                  <Layers3 size={15} />
                  <span className="text-[10px] mt-1 scale-90 select-none">Properties</span>
                </button>
                <button
                  onClick={clearLogs}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-12"
                >
                  <Terminal size={15} />
                  <span className="text-[10px] mt-1 scale-90 select-none">Clear Log</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Show Panels</span>
            </div>

            {/* Display/Rendering Settings */}
            <div className="flex flex-col items-center px-3">
              <div className="flex gap-2.5 flex-1 items-center">
                <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="accent-[#007ACC] w-3.5 h-3.5 cursor-pointer"
                  />
                  <Grid3X3 size={13} className="text-gray-400" />
                  <span>Show Grid</span>
                </label>
                
                <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={wireframe}
                    onChange={(e) => {
                      setWireframe(e.target.checked);
                      addLog(`Wireframe Mode: ${e.target.checked ? 'ON' : 'OFF'}`, 'info');
                    }}
                    className="accent-[#007ACC] w-3.5 h-3.5 cursor-pointer"
                  />
                  <Layers size={13} className="text-gray-400" />
                  <span>Wireframe</span>
                </label>
                
                <label className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showUi}
                    onChange={(e) => setShowUi(e.target.checked)}
                    className="accent-[#007ACC] w-3.5 h-3.5 cursor-pointer"
                  />
                  <Eye size={13} className="text-gray-400" />
                  <span>UI Visibility</span>
                </label>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Render Mode</span>
            </div>
          </>
        )}

        {/* ==================== PLUGINS TAB ==================== */}
        {activeTab === 'Plugins' && (
          <>
            <div className="flex flex-col items-center px-3">
              <div className="flex gap-1.5 flex-1 items-center">
                <button
                  onClick={() => addLog("Opened cloud plugins directory.", "info")}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-24"
                >
                  <Layers size={16} className="text-purple-400" />
                  <span className="text-[10px] mt-1 scale-90 select-none">Manage Plugins</span>
                </button>
                <button
                  onClick={() => addLog("Pre-compiled built-in Roblox plugins loaded successfully.", "info")}
                  className="flex flex-col items-center justify-center p-1 rounded hover:bg-[#3E4249] text-gray-300 hover:text-white transition h-12 w-24"
                >
                  <Box size={16} className="text-blue-400" />
                  <span className="text-[10px] mt-1 scale-90 select-none">Plugins Folder</span>
                </button>
              </div>
              <span className="text-[9px] text-gray-500 mt-1 select-none">Tooling</span>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
