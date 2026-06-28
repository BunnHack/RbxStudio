/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { RobloxInstance, PartMaterial, PartShape, Vector3 } from '../types';

interface PropertiesPanelProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

export default function PropertiesPanel({ state }: PropertiesPanelProps) {
  const {
    instances,
    selectedInstanceId,
    updateInstanceProperties,
    addLog,
  } = state;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Appearance: true,
    Transform: true,
    Behavior: true,
    Data: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const selectedInstance = selectedInstanceId ? instances[selectedInstanceId] : null;

  if (!selectedInstance) {
    return (
      <div className="h-full bg-[#1E2024] flex flex-col text-gray-500 text-[11px] items-center justify-center p-6 text-center select-none">
        <Settings size={28} className="text-gray-600 mb-2 animate-spin-slow" />
        <p className="font-semibold">No selection</p>
        <p className="text-gray-600 mt-1">Select an object in the Explorer or Viewport to view and edit its Properties.</p>
      </div>
    );
  }

  const { properties, className } = selectedInstance;

  const handleTextChange = (propName: string, val: string) => {
    updateInstanceProperties(selectedInstance.id, { [propName]: val });
  };

  const handleNumberChange = (propName: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updateInstanceProperties(selectedInstance.id, { [propName]: num });
    }
  };

  const handleBoolChange = (propName: string, checked: boolean) => {
    updateInstanceProperties(selectedInstance.id, { [propName]: checked });
    addLog(`Set ${selectedInstance.name}.${propName} to ${checked}`, 'info');
  };

  const handleVectorChange = (propName: string, axis: 'x' | 'y' | 'z', val: string) => {
    const currentVector = (properties as any)[propName] as Vector3 || { x: 0, y: 0, z: 0 };
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const updatedVector = { ...currentVector, [axis]: num };
      updateInstanceProperties(selectedInstance.id, { [propName]: updatedVector });
    }
  };

  const renderSectionHeader = (name: string) => {
    const isExpanded = expandedSections[name];
    return (
      <div
        onClick={() => toggleSection(name)}
        className="flex items-center px-2 py-1 bg-[#25282D] border-y border-gray-800 cursor-pointer text-[10px] text-gray-400 font-bold select-none hover:bg-[#2F3238] transition"
      >
        <span className="mr-1">
          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <span className="tracking-wide uppercase">{name}</span>
      </div>
    );
  };

  const renderPropertyRow = (label: string, editor: React.ReactNode) => {
    return (
      <div className="flex border-b border-[#25282D] hover:bg-[#25282D]/35 transition min-h-[22px] items-center text-[11px]">
        <div className="w-1/3 text-gray-400 pl-3 py-0.5 truncate select-none border-r border-[#25282D]" title={label}>
          {label}
        </div>
        <div className="w-2/3 pl-2 py-0.5 pr-1 flex items-center bg-[#1E2024]">
          {editor}
        </div>
      </div>
    );
  };

  const isPart = className === 'Part' || className === 'SpawnLocation';

  return (
    <div className="h-full bg-[#1E2024] flex flex-col border-t border-[#151619] select-none font-sans">
      {/* Header Bar */}
      <div className="px-3 py-1.5 bg-[#25282D] border-b border-[#1A1C1F] flex items-center justify-between">
        <span className="font-semibold text-[11px] text-gray-400 tracking-wider uppercase">Properties</span>
        <span className="text-[10px] bg-[#1E2024] px-1.5 py-0.5 rounded text-gray-400 border border-gray-800 font-mono">
          {selectedInstance.className}
        </span>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px]" id="studio-properties">
        
        {/* ==================== DATA SECTION ==================== */}
        {renderSectionHeader('Data')}
        {expandedSections.Data && (
          <div className="flex flex-col">
            {renderPropertyRow(
              'Name',
              <input
                type="text"
                value={selectedInstance.name}
                onChange={(e) => handleTextChange('Name', e.target.value)}
                className="w-full bg-[#181A1C] text-white px-1.5 py-0.5 rounded border border-transparent focus:border-[#007ACC] outline-none text-[11px]"
              />
            )}
            {renderPropertyRow(
              'ClassName',
              <span className="text-gray-500 pl-1">{selectedInstance.className}</span>
            )}
            {renderPropertyRow(
              'Parent',
              <span className="text-gray-500 pl-1">{selectedInstance.parentId || 'game'}</span>
            )}
          </div>
        )}

        {/* ==================== APPEARANCE SECTION ==================== */}
        {isPart && renderSectionHeader('Appearance')}
        {isPart && expandedSections.Appearance && (
          <div className="flex flex-col">
            {renderPropertyRow(
              'Color',
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="color"
                  value={properties.Color || '#8D9094'}
                  onChange={(e) => updateInstanceProperties(selectedInstance.id, { Color: e.target.value })}
                  className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
                />
                <input
                  type="text"
                  value={properties.Color || '#8D9094'}
                  onChange={(e) => updateInstanceProperties(selectedInstance.id, { Color: e.target.value })}
                  className="flex-1 bg-[#181A1C] text-white px-1.5 py-0.5 rounded border border-transparent text-[11px] outline-none"
                />
              </div>
            )}
            {renderPropertyRow(
              'Material',
              <select
                value={properties.Material || 'Plastic'}
                onChange={(e) => updateInstanceProperties(selectedInstance.id, { Material: e.target.value as PartMaterial })}
                className="w-full bg-[#181A1C] text-white px-1 py-0.5 rounded border border-transparent text-[11px] outline-none cursor-pointer"
              >
                {['Plastic', 'SmoothPlastic', 'Neon', 'Wood', 'Slate', 'Glass', 'Grass', 'Brick', 'Metal'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
            {renderPropertyRow(
              'Transparency',
              <div className="flex items-center gap-2 w-full pr-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={properties.Transparency !== undefined ? properties.Transparency : 0}
                  onChange={(e) => handleNumberChange('Transparency', e.target.value)}
                  className="flex-1 accent-[#007ACC] h-1 bg-gray-800 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={properties.Transparency !== undefined ? properties.Transparency : 0}
                  onChange={(e) => handleNumberChange('Transparency', e.target.value)}
                  className="w-10 bg-[#181A1C] text-white text-center rounded border border-transparent text-[11px]"
                />
              </div>
            )}
            {renderPropertyRow(
              'Reflectance',
              <div className="flex items-center gap-2 w-full pr-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={properties.Reflectance !== undefined ? properties.Reflectance : 0}
                  onChange={(e) => handleNumberChange('Reflectance', e.target.value)}
                  className="flex-1 accent-[#007ACC] h-1 bg-gray-800 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={properties.Reflectance !== undefined ? properties.Reflectance : 0}
                  onChange={(e) => handleNumberChange('Reflectance', e.target.value)}
                  className="w-10 bg-[#181A1C] text-white text-center rounded border border-transparent text-[11px]"
                />
              </div>
            )}
          </div>
        )}

        {/* ==================== TRANSFORM SECTION ==================== */}
        {isPart && renderSectionHeader('Transform')}
        {isPart && expandedSections.Transform && (
          <div className="flex flex-col">
            {/* Size X, Y, Z */}
            {renderPropertyRow(
              'Size',
              <div className="flex gap-1 items-center w-full">
                <span className="text-[10px] text-red-500">X</span>
                <input
                  type="number"
                  value={properties.Size?.x || 0}
                  onChange={(e) => handleVectorChange('Size', 'x', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
                <span className="text-[10px] text-green-500">Y</span>
                <input
                  type="number"
                  value={properties.Size?.y || 0}
                  onChange={(e) => handleVectorChange('Size', 'y', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
                <span className="text-[10px] text-blue-500">Z</span>
                <input
                  type="number"
                  value={properties.Size?.z || 0}
                  onChange={(e) => handleVectorChange('Size', 'z', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
              </div>
            )}

            {/* Position X, Y, Z */}
            {renderPropertyRow(
              'Position',
              <div className="flex gap-1 items-center w-full">
                <span className="text-[10px] text-red-500">X</span>
                <input
                  type="number"
                  value={properties.Position?.x || 0}
                  onChange={(e) => handleVectorChange('Position', 'x', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
                <span className="text-[10px] text-green-500">Y</span>
                <input
                  type="number"
                  value={properties.Position?.y || 0}
                  onChange={(e) => handleVectorChange('Position', 'y', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
                <span className="text-[10px] text-blue-500">Z</span>
                <input
                  type="number"
                  value={properties.Position?.z || 0}
                  onChange={(e) => handleVectorChange('Position', 'z', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
              </div>
            )}

            {/* Rotation X, Y, Z */}
            {renderPropertyRow(
              'Rotation',
              <div className="flex gap-1 items-center w-full">
                <span className="text-[10px] text-red-500">X</span>
                <input
                  type="number"
                  value={properties.Rotation?.x || 0}
                  onChange={(e) => handleVectorChange('Rotation', 'x', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
                <span className="text-[10px] text-green-500">Y</span>
                <input
                  type="number"
                  value={properties.Rotation?.y || 0}
                  onChange={(e) => handleVectorChange('Rotation', 'y', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
                <span className="text-[10px] text-blue-500">Z</span>
                <input
                  type="number"
                  value={properties.Rotation?.z || 0}
                  onChange={(e) => handleVectorChange('Rotation', 'z', e.target.value)}
                  className="w-full bg-[#181A1C] text-white text-center rounded text-[11px] py-0.5"
                />
              </div>
            )}
          </div>
        )}

        {/* ==================== BEHAVIOR SECTION ==================== */}
        {isPart && renderSectionHeader('Behavior')}
        {isPart && expandedSections.Behavior && (
          <div className="flex flex-col">
            {renderPropertyRow(
              'Anchored',
              <input
                type="checkbox"
                checked={properties.Anchored || false}
                onChange={(e) => handleBoolChange('Anchored', e.target.checked)}
                className="accent-[#007ACC] rounded bg-[#181A1C] w-3.5 h-3.5 cursor-pointer ml-1"
              />
            )}
            {renderPropertyRow(
              'CanCollide',
              <input
                type="checkbox"
                checked={properties.CanCollide !== undefined ? properties.CanCollide : true}
                onChange={(e) => handleBoolChange('CanCollide', e.target.checked)}
                className="accent-[#007ACC] rounded bg-[#181A1C] w-3.5 h-3.5 cursor-pointer ml-1"
              />
            )}
            {renderPropertyRow(
              'Locked',
              <input
                type="checkbox"
                checked={properties.Locked || false}
                onChange={(e) => handleBoolChange('Locked', e.target.checked)}
                className="accent-[#007ACC] rounded bg-[#181A1C] w-3.5 h-3.5 cursor-pointer ml-1"
              />
            )}
          </div>
        )}

        {/* ==================== SCRIPT CUSTOM BEHAVIOR SECTION ==================== */}
        {(className === 'Script' || className === 'LocalScript') && renderSectionHeader('Behavior')}
        {(className === 'Script' || className === 'LocalScript') && expandedSections.Behavior && (
          <div className="flex flex-col">
            {renderPropertyRow(
              'Enabled',
              <input
                type="checkbox"
                checked={properties.Enabled !== undefined ? properties.Enabled : true}
                onChange={(e) => handleBoolChange('Enabled', e.target.checked)}
                className="accent-[#007ACC] rounded bg-[#181A1C] w-3.5 h-3.5 cursor-pointer ml-1"
              />
            )}
          </div>
        )}

        {/* ==================== LIGHTING SECTION ==================== */}
        {className === 'Lighting' && renderSectionHeader('Atmosphere')}
        {className === 'Lighting' && expandedSections.Appearance && (
          <div className="flex flex-col">
            {renderPropertyRow(
              'Ambient',
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="color"
                  value={properties.Ambient || '#707070'}
                  onChange={(e) => updateInstanceProperties(selectedInstance.id, { Ambient: e.target.value })}
                  className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
                />
                <input
                  type="text"
                  value={properties.Ambient || '#707070'}
                  onChange={(e) => updateInstanceProperties(selectedInstance.id, { Ambient: e.target.value })}
                  className="flex-1 bg-[#181A1C] text-white px-1.5 py-0.5 rounded text-[11px]"
                />
              </div>
            )}
            {renderPropertyRow(
              'Brightness',
              <input
                type="number"
                step="0.5"
                value={properties.Brightness !== undefined ? properties.Brightness : 2}
                onChange={(e) => handleNumberChange('Brightness', e.target.value)}
                className="w-16 bg-[#181A1C] text-white px-1.5 py-0.5 rounded border border-transparent text-[11px]"
              />
            )}
            {renderPropertyRow(
              'TimeOfDay',
              <input
                type="text"
                value={properties.TimeOfDay || '14:00:00'}
                onChange={(e) => handleTextChange('TimeOfDay', e.target.value)}
                className="w-full bg-[#181A1C] text-white px-1.5 py-0.5 rounded border border-transparent text-[11px]"
              />
            )}
            {renderPropertyRow(
              'GlobalShadows',
              <input
                type="checkbox"
                checked={properties.GlobalShadows !== undefined ? properties.GlobalShadows : true}
                onChange={(e) => handleBoolChange('GlobalShadows', e.target.checked)}
                className="accent-[#007ACC] rounded bg-[#181A1C] w-3.5 h-3.5 cursor-pointer ml-1"
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
