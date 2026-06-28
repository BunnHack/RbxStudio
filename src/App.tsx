/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useRobloxState } from './hooks/useRobloxState';
import MenuBar from './components/MenuBar';
import RibbonBar from './components/RibbonBar';
import Toolbox from './components/Toolbox';
import Viewport from './components/Viewport';
import ScriptEditor from './components/ScriptEditor';
import Explorer from './components/Explorer';
import PropertiesPanel from './components/PropertiesPanel';
import OutputConsole from './components/OutputConsole';
import { X, Wind, Award } from 'lucide-react';

export default function App() {
  const state = useRobloxState();
  const {
    viewportTab,
    selectedInstanceId,
    duplicateInstance,
    deleteInstance,
    undo,
    redo,
    addLog,
  } = state;

  // Premium UI & Layout states coordinated with the MenuBar
  const [emulatorDevice, setEmulatorDevice] = useState<string | null>(null);
  const [emulatorOrientation, setEmulatorOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showWindControl, setShowWindControl] = useState<boolean>(false);
  const [windSpeed, setWindSpeed] = useState<number>(15);
  const [windDirection, setWindDirection] = useState<number>(45);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>(['Building Tools by F3X']);

  // Global Keyboard Shortcuts (IDE Level)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is actively typing in a text area or code editor
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      // 1. Ctrl + Z (Undo)
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }

      // 2. Ctrl + Y (Redo)
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }

      // 3. Ctrl + D (Duplicate Part)
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedInstanceId) {
          duplicateInstance(selectedInstanceId);
        } else {
          addLog('Select an instance to duplicate.', 'warn');
        }
      }

      // 4. Delete or Backspace (Remove Instance)
      if (e.key === 'Delete') {
        if (selectedInstanceId) {
          deleteInstance(selectedInstanceId);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [selectedInstanceId, undo, redo, duplicateInstance, deleteInstance, addLog]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#1E2024] text-gray-200 overflow-hidden font-sans antialiased select-none relative">
      
      {/* 0. Roblox Studio Top System Menu Bar */}
      <MenuBar
        state={state}
        emulatorDevice={emulatorDevice}
        setEmulatorDevice={setEmulatorDevice}
        emulatorOrientation={emulatorOrientation}
        setEmulatorOrientation={setEmulatorOrientation}
        showWindControl={showWindControl}
        setShowWindControl={setShowWindControl}
        windSpeed={windSpeed}
        setWindSpeed={setWindSpeed}
        windDirection={windDirection}
        setWindDirection={setWindDirection}
        tourStep={tourStep}
        setTourStep={setTourStep}
        installedPlugins={installedPlugins}
        setInstalledPlugins={setInstalledPlugins}
      />

      {/* 1. Roblox Studio Ribbon Bar Controls (Top Panel) */}
      <RibbonBar state={state} />

      {/* 2. Main Workspace Partition Layout (Left Toolbox, Center Viewport/Script, Right Explorer/Props) */}
      <div className="flex-1 flex overflow-hidden w-full items-stretch relative">
        
        {/* Left Drawer Column: Toolbox (Marketplace assets) */}
        <aside className="w-[240px] shrink-0 h-full border-r border-[#151619] bg-[#1E2024] flex flex-col overflow-hidden">
          <Toolbox state={state} />
        </aside>

        {/* Center Canvas Column (Viewport & Output Logger stack) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#151619]">
          
          {/* Active Worksite Screen (3D Scene Viewport OR Lua Script Editor tabs) */}
          <section className="flex-1 min-h-0 relative bg-[#181A1C]">
            {viewportTab === 'Viewport' ? (
              emulatorDevice ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0C0D0E] p-4 overflow-auto">
                  <div className="flex flex-col items-center gap-2">
                    {/* Device Header Panel */}
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                      <span>Simulating: <strong className="text-gray-300">{emulatorDevice}</strong></span>
                      <span>•</span>
                      <button 
                        onClick={() => setEmulatorOrientation(emulatorOrientation === 'portrait' ? 'landscape' : 'portrait')}
                        className="bg-[#2D3035] hover:bg-[#3E4249] px-2 py-0.5 rounded text-gray-300 font-semibold cursor-pointer transition"
                      >
                        🔄 Rotate: {emulatorOrientation.toUpperCase()}
                      </button>
                      <span>•</span>
                      <button 
                        onClick={() => setEmulatorDevice(null)}
                        className="text-red-400 hover:text-red-300 font-bold cursor-pointer transition"
                      >
                        Exit Simulation Frame
                      </button>
                    </div>

                    {/* Outer Phone Bezel */}
                    <div 
                      className={`relative bg-black rounded-[48px] p-4 border-4 border-gray-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] transition-all duration-300 flex items-center justify-center shrink-0 ${
                        emulatorOrientation === 'portrait' 
                          ? 'w-[370px] h-[730px]' 
                          : 'w-[730px] h-[370px]'
                      }`}
                    >
                      {/* Dynamic Island / Camera punch hole */}
                      <div 
                        className={`absolute bg-black rounded-full z-20 ${
                          emulatorOrientation === 'portrait' 
                            ? 'top-5 left-1/2 -translate-x-1/2 w-[110px] h-[25px]' 
                            : 'top-1/2 -translate-y-1/2 left-5 w-[25px] h-[110px]'
                        }`}
                      ></div>

                      {/* Screen Container */}
                      <div className="w-full h-full rounded-[34px] overflow-hidden relative bg-black border border-gray-900">
                        <Viewport state={state} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Viewport state={state} />
              )
            ) : (
              <ScriptEditor state={state} />
            )}
          </section>

          {/* Bottom Feed Column: System and Script Output console */}
          <section className="h-[210px] shrink-0 bg-[#1E2024] border-t border-[#151619] overflow-hidden">
            <OutputConsole state={state} />
          </section>

        </main>

        {/* Right Sidebar Column: Hierarchy Explorer & Property Editors */}
        <aside className="w-[280px] shrink-0 h-full border-l border-[#151619] bg-[#1E2024] flex flex-col overflow-hidden">
          
          {/* Top Half Panel: Hierarchical Explorer tree */}
          <div className="h-1/2 min-h-[150px] overflow-hidden">
            <Explorer state={state} />
          </div>

          {/* Bottom Half Panel: Detail Property Inspector */}
          <div className="h-1/2 min-h-[150px] overflow-hidden">
            <PropertiesPanel state={state} />
          </div>

        </aside>

      </div>

      {/* ================= EXTRA INTERACTIVE WIDGETS RENDERING ================= */}

      {/* Floating Wind Control Widget */}
      {showWindControl && (
        <div className="absolute top-[80px] left-64 bg-[#1C1D1F]/95 backdrop-blur-sm border border-gray-700 p-4 rounded-lg shadow-2xl z-40 w-60 text-xs font-sans text-gray-300 animate-in slide-in-from-left-4 duration-200">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <span className="font-bold text-gray-200 flex items-center gap-1.5">
              <Wind size={13} className="text-blue-400 animate-pulse" /> Wind Physics Setup
            </span>
            <button onClick={() => setShowWindControl(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={12} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Wind Velocity</span>
                <span className="font-mono text-blue-400 font-bold">{windSpeed} studs/s</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="120" 
                value={windSpeed}
                onChange={(e) => {
                  setWindSpeed(Number(e.target.value));
                  if (Number(e.target.value) > 80) {
                    addLog("Warning: High wind speeds may destabilize light physics constraints!", "warn");
                  }
                }}
                className="w-full accent-blue-500 cursor-pointer h-1 rounded bg-gray-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Wind Heading Direction</span>
                <span className="font-mono text-blue-400 font-bold">{windDirection}°</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="359" 
                value={windDirection}
                onChange={(e) => setWindDirection(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1 rounded bg-gray-800"
              />
            </div>

            {/* Compass Vector Dial */}
            <div className="flex justify-center items-center py-2">
              <div className="w-16 h-16 rounded-full border border-gray-800 bg-[#121315] relative flex items-center justify-center">
                <span className="absolute top-0.5 text-[8px] text-gray-600 font-bold">N</span>
                <span className="absolute bottom-0.5 text-[8px] text-gray-600 font-bold">S</span>
                <span className="absolute left-0.5 text-[8px] text-gray-600 font-bold">W</span>
                <span className="absolute right-0.5 text-[8px] text-gray-600 font-bold">E</span>
                
                {/* Wind Arrow Indicator */}
                <div 
                  className="w-1 h-10 bg-transparent relative origin-center" 
                  style={{ transform: `rotate(${windDirection}deg)` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-gradient-to-b from-blue-400 to-transparent rounded-t-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE STUDIO TOUR POPOVER */}
      {tourStep !== null && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center animate-in fade-in duration-150">
          <div className="bg-[#1C1D1F] border-2 border-yellow-500/80 w-full max-w-[380px] p-5 rounded-lg shadow-2xl relative font-sans text-xs">
            {/* Top Close Button */}
            <button onClick={() => setTourStep(null)} className="absolute top-3 right-3 text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>
            
            {/* Steps Headings */}
            <div className="flex items-center gap-1.5 text-yellow-500 font-bold uppercase tracking-wider text-[10px] mb-1">
              <Award size={12} /> Guided Studio Tour • Step {tourStep + 1} of 5
            </div>

            {tourStep === 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-gray-200 text-sm">Roblox Ribbon Control Bar</h3>
                <p className="text-gray-300 leading-relaxed">
                  Located at the top of the screen, the **Ribbon Bar** contains all tools needed for standard level design: part spawning tools, snap settings, and tool modes like **Select**, **Move**, **Scale**, and **Rotate**!
                </p>
                <div className="mt-2 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 p-2.5 rounded font-mono text-[10px]">
                  💡 Try swapping tabs (Home, Model, Test, View, Plugins) to see different specialized toolsets!
                </div>
              </div>
            )}

            {tourStep === 1 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-gray-200 text-sm">Interactive 3D Viewport</h3>
                <p className="text-gray-300 leading-relaxed">
                  The **3D Viewport** is your active construction stage. You can inspect objects and place structures.
                </p>
                <div className="mt-2 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 p-2.5 rounded font-mono text-[10px] flex flex-col gap-1">
                  <div>🖱️ Orbit: Hold Right-Click + Drag cursor</div>
                  <div>⌨️ Move: Use W-A-S-D & Q-E keys</div>
                  <div>🎯 Focus: Select an object and press "F"</div>
                </div>
              </div>
            )}

            {tourStep === 2 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-gray-200 text-sm">Hierarchical Object Explorer</h3>
                <p className="text-gray-300 leading-relaxed">
                  The **Explorer** panel (top right) lists all active servers, environments, parts, scripts, and parent-child hierarchies.
                </p>
                <div className="mt-2 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 p-2.5 rounded font-mono text-[10px]">
                  💻 Double-click Script instances here to open the script editor and run active Lua code!
                </div>
              </div>
            )}

            {tourStep === 3 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-gray-200 text-sm">Detail Properties Inspector</h3>
                <p className="text-gray-300 leading-relaxed">
                  The **Properties Panel** (bottom right) lets you review and edit selected part attributes: Color, Material textures, Anchored physics, Transparency, and precise Size/Position vectors.
                </p>
                <div className="mt-2 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 p-2.5 rounded font-mono text-[10px]">
                  🎨 Toggle "Color Fill Mode" in the ribbon to paint parts directly in the viewport!
                </div>
              </div>
            )}

            {tourStep === 4 && (
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-gray-200 text-sm">System Output Console</h3>
                <p className="text-gray-300 leading-relaxed">
                  The **Output Console** at the bottom records print outputs, physics warnings, and compiling errors in real-time during game simulation tests.
                </p>
                <div className="mt-2 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 p-2.5 rounded font-mono text-[10px]">
                  🚀 Start a test using "Test" &rarr; "Play Solo" to see scripts execute live in the sandbox!
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between mt-5 border-t border-gray-800 pt-3">
              <button 
                onClick={() => setTourStep(null)}
                className="text-gray-500 hover:text-gray-300 cursor-pointer font-bold"
              >
                Skip Tour
              </button>
              <div className="flex gap-2">
                {tourStep > 0 && (
                  <button 
                    onClick={() => setTourStep(tourStep - 1)}
                    className="border border-gray-800 hover:bg-gray-800 text-gray-300 px-3 py-1 rounded cursor-pointer transition font-bold"
                  >
                    Back
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (tourStep < 4) {
                      setTourStep(tourStep + 1);
                    } else {
                      setTourStep(null);
                      addLog("🎉 Congratulations! You completed the Roblox Studio Guided Tour! Let's get building!", "success");
                    }
                  }}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-1.5 rounded cursor-pointer transition font-bold"
                >
                  {tourStep === 4 ? 'Finish Guide' : 'Next Step'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

