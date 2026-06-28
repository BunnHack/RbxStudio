/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Play, Code, CheckCircle, Save } from 'lucide-react';
import { OpenScriptTab, RobloxInstance } from '../types';

interface ScriptEditorProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

export default function ScriptEditor({ state }: ScriptEditorProps) {
  const {
    instances,
    openScripts,
    activeScriptInstanceId,
    setActiveScriptInstanceId,
    closeScriptTab,
    setViewportTab,
    updateInstanceProperties,
    addLog,
  } = state;

  const [code, setCode] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load code when the active script changes
  useEffect(() => {
    if (activeScriptInstanceId) {
      const scriptInst = instances[activeScriptInstanceId];
      if (scriptInst) {
        setCode(scriptInst.properties.Source || '');
      }
    }
  }, [activeScriptInstanceId, instances]);

  const activeScript = activeScriptInstanceId ? instances[activeScriptInstanceId] : null;

  if (!activeScript) {
    return (
      <div className="h-full bg-[#181A1C] flex items-center justify-center text-gray-500 font-mono text-[11px]">
        No active script open.
      </div>
    );
  }

  const handleSave = () => {
    if (activeScriptInstanceId) {
      updateInstanceProperties(activeScriptInstanceId, { Source: code });
      addLog(`Saved changes to script: '${activeScript.name}'`, 'success');
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    }
  };

  // Enable Tab Key Indentation inside Textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const target = e.currentTarget;

      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);

      // Reset cursor position
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Generate line numbers
  const lines = code.split('\n');
  const lineNumbers = Array.from({ length: Math.max(1, lines.length) }, (_, i) => i + 1);

  return (
    <div className="h-full bg-[#1A1C1F] flex flex-col font-mono text-xs select-text relative">
      
      {/* Tab Header Bar */}
      <div className="flex bg-[#25282D] border-b border-gray-800 items-center justify-between select-none pr-3">
        <div className="flex items-center overflow-x-auto">
          {/* Main Viewport Tab button */}
          <button
            onClick={() => setViewportTab('Viewport')}
            className="px-3.5 py-2 bg-[#2D3035]/50 border-r border-gray-800 hover:bg-[#2D3035] text-gray-400 hover:text-white flex items-center gap-1.5 font-sans font-medium transition text-[11px]"
          >
            <Code size={13} className="text-[#00A2FF]" />
            Viewport
          </button>

          {/* Active script tabs */}
          {openScripts.map((tab) => {
            const isActive = activeScriptInstanceId === tab.instanceId;
            return (
              <div
                key={tab.instanceId}
                className={`flex items-center border-r border-gray-800 px-3 py-2 transition text-[11px] ${
                  isActive
                    ? 'bg-[#1A1C1F] text-white border-t-2 border-t-orange-500 font-semibold shadow'
                    : 'bg-[#2D3035]/30 text-gray-400 hover:bg-[#2D3035]/80 hover:text-gray-200'
                }`}
              >
                <button
                  onClick={() => {
                    setActiveScriptInstanceId(tab.instanceId);
                    setViewportTab('Script');
                  }}
                  className="flex items-center gap-1.5 mr-2 select-none"
                >
                  <Terminal size={12} className={isActive ? 'text-orange-400' : 'text-orange-500/60'} />
                  <span>{tab.name}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeScriptTab(tab.instanceId);
                  }}
                  className="hover:bg-red-500/20 hover:text-red-400 rounded p-0.5 transition"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Save & Apply Action */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded text-[11px] font-sans font-semibold transition shadow shadow-orange-950/40"
        >
          <Save size={12} />
          Save & Apply
        </button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative leading-relaxed py-2">
        {/* Line Numbers gutter */}
        <div className="w-12 text-right text-gray-600 select-none pr-3 border-r border-gray-800/60 flex flex-col text-[11px] leading-[18px]">
          {lineNumbers.map((num) => (
            <div key={num} className="font-mono pr-0.5">
              {num}
            </div>
          ))}
        </div>

        {/* Textarea Input area */}
        <div className="flex-1 h-full overflow-hidden">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent text-gray-100 font-mono text-[11px] outline-none border-0 resize-none px-3 select-text leading-[18px] focus:ring-0 overflow-y-auto selection:bg-[#007ACC]/50 scrollbar-thin"
            placeholder="-- Write your Roblox scripts here... --"
            spellCheck="false"
          />
        </div>
      </div>

      {/* Code Editor Legend / Status */}
      <div className="px-3 py-1 bg-[#151619] border-t border-gray-800 flex justify-between select-none text-[10px] text-gray-500">
        <div className="flex items-center gap-3">
          <span>Language: Roblox Luau (Transpiled)</span>
          <span>Source: {activeScript.name}</span>
        </div>
        <div>
          <span>Lines: {lines.length}</span>
        </div>
      </div>

      {/* Save Toast notification */}
      {showSaveSuccess && (
        <div className="absolute top-12 right-4 bg-green-600 text-white flex items-center gap-2 px-3 py-1.5 rounded-md shadow-xl text-xs font-sans animate-fade-in z-50">
          <CheckCircle size={14} fill="currentColor" className="text-green-900" />
          <span>Applied script source successfully!</span>
        </div>
      )}

    </div>
  );
}
