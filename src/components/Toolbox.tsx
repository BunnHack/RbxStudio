/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Sparkles, Box, Swords, ShieldAlert, Cpu, Heart, Trees } from 'lucide-react';
import { InstanceClass, PartMaterial, PartShape, RobloxInstance } from '../types';

interface ToolboxProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

interface ToolboxItem {
  name: string;
  className: InstanceClass;
  icon: React.ReactNode;
  category: 'Presets' | 'Scripted';
  description: string;
  properties: Partial<RobloxInstance['properties']>;
  scriptSource?: string; // Pre-written scripts to attach!
}

export default function Toolbox({ state }: ToolboxProps) {
  const { addInstance, updateInstanceProperties, addLog } = state;
  const [searchQuery, setSearchQuery] = useState('');

  const toolboxItems: ToolboxItem[] = [
    {
      name: 'Spawn Location',
      className: 'SpawnLocation',
      icon: <Sparkles size={16} className="text-yellow-400" />,
      category: 'Presets',
      description: 'Official spawning platform for characters.',
      properties: {
        Name: 'SpawnLocation',
        Size: { x: 6, y: 1, z: 6 },
        Color: '#B0B0B0',
        Material: 'SmoothPlastic',
        Anchored: true,
      },
    },
    {
      name: 'Lucky Block',
      className: 'Part',
      icon: <Box size={16} className="text-amber-400" />,
      category: 'Presets',
      description: 'A yellow mystery block with a question mark.',
      properties: {
        Name: 'LuckyBlock',
        Size: { x: 3, y: 3, z: 3 },
        Color: '#F5BD02',
        Material: 'Neon',
        Anchored: false,
      },
      scriptSource: `-- Lucky Block Script
local part = script.Parent
print("Mystery Block active! Touch or click to open.")

while true do
  -- Slow hovering rotation
  part.Rotation.y = part.Rotation.y + 1
  part.Rotation.x = part.Rotation.x + 0.5
  wait(0.04)
end
`,
    },
    {
      name: 'Classic Sword',
      className: 'Part',
      icon: <Swords size={16} className="text-red-400" />,
      category: 'Presets',
      description: 'Retro combat tool weapon.',
      properties: {
        Name: 'ClassicSword',
        Size: { x: 1, y: 6, z: 1 },
        Color: '#A0A0A0',
        Material: 'Metal',
        Anchored: false,
      },
    },
    {
      name: 'Blocky Tree',
      className: 'Part',
      icon: <Trees size={16} className="text-green-500" />,
      category: 'Presets',
      description: 'Classic blocky simulator pine tree.',
      properties: {
        Name: 'Trunk',
        Size: { x: 2, y: 8, z: 2 },
        Color: '#5C4033', // Brown trunk
        Material: 'Wood',
        Anchored: true,
      },
      // Note: We can expand this on spawn by making a trunk and a leaf block!
    },
    {
      name: 'Rotating Spinner',
      className: 'Part',
      icon: <Cpu size={16} className="text-cyan-400" />,
      category: 'Scripted',
      description: 'A neon spinner part that spins continuously.',
      properties: {
        Name: 'SpinnerPart',
        Size: { x: 8, y: 1, z: 2 },
        Color: '#00FFFF',
        Material: 'Neon',
        Anchored: true,
      },
      scriptSource: `-- Spinner script
local part = script.Parent
print("Spinner Script Running! Rotating part continuously...")

while true do
  part.Rotation.y = part.Rotation.y + 5
  wait(0.02)
end
`,
    },
    {
      name: 'Flickering Crystal',
      className: 'Part',
      icon: <ShieldAlert size={16} className="text-purple-400" />,
      category: 'Scripted',
      description: 'Crystal neon block that flashes on and off.',
      properties: {
        Name: 'CrystalPart',
        Size: { x: 2, y: 4, z: 2 },
        Color: '#C000FF',
        Material: 'Neon',
        Anchored: true,
      },
      scriptSource: `-- Flickering script
local part = script.Parent
print("Flicker Crystal Script active.")

while true do
  part.Transparency = 0
  part.Color = "#C000FF"
  wait(0.5)
  part.Transparency = 0.8
  part.Color = "#200030"
  wait(0.5)
end
`,
    },
    {
      name: 'Jumper Block',
      className: 'Part',
      icon: <Heart size={16} className="text-rose-500" fill="currentColor" />,
      category: 'Scripted',
      description: 'Unanchored brick that jumps into the air!',
      properties: {
        Name: 'JumperBlock',
        Size: { x: 3, y: 3, z: 3 },
        Color: '#FF3B30',
        Material: 'Plastic',
        Anchored: false,
      },
      scriptSource: `-- Jumping brick script
local part = script.Parent
print("Jumper Block initialized! Get ready to leap!")

while true do
  wait(2.0)
  print("Leaping!")
  part.Position.y = part.Position.y + 6
end
`,
    },
    {
      name: 'Rainbow Sphere',
      className: 'Part',
      icon: <Box size={16} className="text-pink-400" />,
      category: 'Scripted',
      description: 'Cycles through all colors of the rainbow.',
      properties: {
        Name: 'RainbowSphere',
        Size: { x: 4, y: 4, z: 4 },
        Color: '#FF0000',
        Material: 'Glass',
        Shape: 'Sphere',
        Anchored: true,
      },
      scriptSource: `-- Rainbow cycling script
local part = script.Parent
local angle = 0

print("Rainbow cycle active!")

while true do
  local r = math.sin(angle) * 127 + 128
  local g = math.sin(angle + 2) * 127 + 128
  local b = math.sin(angle + 4) * 127 + 128
  
  part.Color = Color3.fromRGB(r, g, b)
  angle = angle + 0.1
  wait(0.08)
end
`,
    }
  ];

  const handleInsertItem = (item: ToolboxItem) => {
    // 1. Spawn primary part
    const spawnedId = addInstance(item.className, 'Workspace', item.properties);
    
    // 2. If scripted, add a Script instance inside it!
    if (item.scriptSource) {
      addInstance('Script', spawnedId, {
        Name: `${item.name}Script`,
        Source: item.scriptSource,
      });
    }

    // 3. Special cases: procedurally spawn secondary parts (like leaves for Tree!)
    if (item.name === 'Blocky Tree') {
      // Spawn leaves on top!
      const parentPos = item.properties.Position || { x: 0, y: 2, z: 0 };
      const parentHeight = item.properties.Size?.y || 8;
      
      const siblingParts = (Object.values(state.instances) as RobloxInstance[]).filter(
        (inst) => inst.parentId === 'Workspace' && (inst.className === 'Part' || inst.className === 'SpawnLocation')
      );
      const offset = siblingParts.length * 2.5;

      // Reset spawned trunk position first for perfect stacking
      const trunkPos = { x: offset % 15 - 5, y: 4, z: Math.floor(offset / 15) * 4 - 5 };
      updateInstanceProperties(spawnedId, { Position: trunkPos });

      // Spawn leaf box
      addInstance('Part', 'Workspace', {
        Name: 'Leaves',
        Size: { x: 6, y: 6, z: 6 },
        Position: { x: trunkPos.x, y: trunkPos.y + parentHeight / 2 + 2, z: trunkPos.z },
        Color: '#2E8B57', // Forest green
        Material: 'Grass',
        Anchored: true,
      });
    }

    addLog(`Spawned Toolbox asset '${item.name}' into Workspace.`, 'success');
  };

  const filteredItems = toolboxItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-[#1E2024] flex flex-col border-r border-[#151619] select-none font-sans">
      {/* Header Panel */}
      <div className="px-3 py-1.5 bg-[#25282D] border-b border-[#1A1C1F] flex items-center justify-between">
        <span className="font-semibold text-[11px] text-gray-400 tracking-wider uppercase">Toolbox</span>
        <span className="text-[10px] text-yellow-500 font-bold border border-yellow-800 bg-yellow-950/20 px-1.5 py-0.2 rounded">
          Marketplace
        </span>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-gray-800 flex gap-1 bg-[#25282D]/40">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search Toolbox..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181A1C] text-white pl-7 pr-2 py-1 rounded text-[11px] border border-transparent focus:border-[#007ACC] outline-none"
          />
          <Search size={11} className="absolute left-2.5 top-2.5 text-gray-500" />
        </div>
      </div>

      {/* Toolbox Items Container */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
        {/* Category: Classic Presets */}
        <div>
          <h3 className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5 px-1">Classic Presets</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredItems
              .filter((i) => i.category === 'Presets')
              .map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleInsertItem(item)}
                  id={`toolbox-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-[#25282D] border border-gray-800 hover:border-gray-600 rounded p-2 text-left transition hover:bg-[#2C3036] flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-10 h-10 bg-[#181A1C] rounded flex items-center justify-center group-hover:scale-105 transition mb-1.5">
                    {item.icon}
                  </div>
                  <div className="font-semibold text-[10px] text-gray-200 truncate w-full">{item.name}</div>
                  <div className="text-[8px] text-gray-500 leading-tight mt-0.5 max-h-[22px] overflow-hidden truncate w-full">
                    {item.description}
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Category: Scripted Interactive Objects */}
        <div>
          <h3 className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-2 mb-1.5 px-1">Scripted Objects</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredItems
              .filter((i) => i.category === 'Scripted')
              .map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleInsertItem(item)}
                  id={`toolbox-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-[#25282D] border border-gray-800 hover:border-gray-600 rounded p-2 text-left transition hover:bg-[#2C3036] flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-10 h-10 bg-[#181A1C] rounded flex items-center justify-center group-hover:scale-105 transition mb-1.5">
                    {item.icon}
                  </div>
                  <div className="font-semibold text-[10px] text-cyan-400 truncate w-full">{item.name}</div>
                  <div className="text-[8px] text-gray-500 leading-tight mt-0.5 max-h-[22px] overflow-hidden truncate w-full">
                    {item.description}
                  </div>
                </button>
              ))}
          </div>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center text-gray-600 text-[10px] py-12 select-none">
            No items matched your search query.
          </div>
        )}
      </div>
    </div>
  );
}
