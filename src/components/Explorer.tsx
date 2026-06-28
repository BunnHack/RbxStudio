/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Users,
  Sun,
  Palette,
  Folder,
  Package,
  Terminal,
  Cpu,
  Tv,
  Backpack,
  User,
  Plus,
  Trash2,
  Copy,
  Box,
  CircleDot,
} from 'lucide-react';
import { RobloxInstance, InstanceClass } from '../types';

interface ExplorerProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

export default function Explorer({ state }: ExplorerProps) {
  const {
    instances,
    selectedInstanceId,
    setSelectedInstanceId,
    expandedInstanceIds,
    toggleExpanded,
    addInstance,
    deleteInstance,
    duplicateInstance,
    openScript,
  } = state;

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [insertMenuNodeId, setInsertMenuNodeId] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (insertMenuNodeId) {
        setInsertMenuNodeId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [insertMenuNodeId]);

  // Map InstanceClass to Lucide icons
  const getClassIcon = (className: string) => {
    switch (className) {
      case 'Workspace':
        return <Globe size={13} className="text-blue-400" />;
      case 'Players':
        return <Users size={13} className="text-sky-400" />;
      case 'Lighting':
        return <Sun size={13} className="text-yellow-400" fill="currentColor" />;
      case 'MaterialService':
        return <Palette size={13} className="text-pink-400" />;
      case 'ReplicatedStorage':
        return <Folder size={13} className="text-amber-400" fill="currentColor" />;
      case 'ServerScriptService':
        return <Cpu size={13} className="text-indigo-400" />;
      case 'ServerStorage':
        return <Folder size={13} className="text-gray-400" fill="currentColor" />;
      case 'StarterGui':
        return <Tv size={13} className="text-purple-400" />;
      case 'StarterPack':
        return <Backpack size={13} className="text-green-400" />;
      case 'StarterPlayer':
        return <User size={13} className="text-teal-400" />;
      case 'Part':
        return <Box size={13} className="text-slate-400" fill="currentColor" />;
      case 'SpawnLocation':
        return <CircleDot size={13} className="text-yellow-500" fill="currentColor" />;
      case 'Script':
        return <Terminal size={13} className="text-orange-400" />;
      case 'LocalScript':
        return <Terminal size={13} className="text-cyan-400" />;
      case 'Folder':
        return <Folder size={13} className="text-yellow-500" fill="currentColor" />;
      case 'Model':
        return <Package size={13} className="text-amber-500" />;
      default:
        return <Folder size={13} className="text-gray-400" />;
    }
  };

  const getChildren = (parentId: string | null): RobloxInstance[] => {
    return (Object.values(instances) as RobloxInstance[]).filter((inst) => inst.parentId === parentId);
  };

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInstanceId(id);
  };

  const handleNodeDoubleClick = (id: string) => {
    const inst = instances[id];
    if (inst && (inst.className === 'Script' || inst.className === 'LocalScript')) {
      openScript(id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedInstanceId(nodeId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
    });
  };

  // Insert Object helpers
  const triggerInsert = (className: InstanceClass, parentId: string) => {
    addInstance(className, parentId);
    setContextMenu(null);
    setInsertMenuNodeId(null);
  };

  // Render a node and its children recursively
  const renderNode = (node: RobloxInstance, depth: number) => {
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedInstanceIds.has(node.id);
    const isSelected = selectedInstanceId === node.id;

    return (
      <div key={node.id} className="text-[11px] select-none">
        {/* Node Label row */}
        <div
          id={`explorer-node-${node.id}`}
          className={`flex items-center group py-0.5 px-1 cursor-pointer transition ${
            isSelected
              ? 'bg-[#007ACC] text-white font-medium'
              : 'text-gray-300 hover:bg-[#2A2E34]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={(e) => handleNodeClick(node.id, e)}
          onDoubleClick={() => handleNodeDoubleClick(node.id)}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
        >
          {/* Chevron expand/collapse */}
          <div
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white transition"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={11} className={isSelected ? 'text-white' : 'text-gray-400'} />
              ) : (
                <ChevronRight size={11} className={isSelected ? 'text-white' : 'text-gray-400'} />
              )
            ) : null}
          </div>

          {/* Class Icon */}
          <span className="mr-1.5 flex items-center">{getClassIcon(node.className)}</span>

          {/* Instance Name */}
          <span className="truncate flex-1 select-none">{node.name}</span>

          {/* Inline Quick Add button on hover */}
          {hoveredNodeId === node.id && (
            <div className="flex items-center gap-1 opacity-100 pr-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedInstanceId(node.id);
                  setInsertMenuNodeId(node.id);
                }}
                title="Insert Object"
                className={`p-0.5 rounded hover:bg-[#3E4249] transition ${
                  isSelected ? 'text-white hover:bg-blue-700' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Plus size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Children Render block */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Roots are items with parentId === null (Service containers)
  const rootServices = getChildren(null);

  return (
    <div className="h-full bg-[#1E2024] flex flex-col border-b border-[#151619] relative select-none">
      {/* Header Panel */}
      <div className="px-3 py-1.5 bg-[#25282D] border-b border-[#1A1C1F] flex items-center justify-between">
        <span className="font-semibold text-[11px] text-gray-400 tracking-wider uppercase">Explorer</span>
        <div className="flex items-center gap-1.5 text-gray-500">
          <button
            onClick={() => selectedInstanceId && addInstance('Part', selectedInstanceId)}
            disabled={!selectedInstanceId}
            title="Add part inside selected"
            className="p-0.5 hover:bg-[#3E4249] rounded hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => selectedInstanceId && deleteInstance(selectedInstanceId)}
            disabled={!selectedInstanceId}
            title="Delete selection"
            className="p-0.5 hover:bg-[#3E4249] rounded hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-red-500 hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Explorer Tree Body */}
      <div className="flex-1 overflow-y-auto py-1 font-mono text-[11px]" id="studio-explorer">
        {/* Abstract game Node */}
        <div className="flex items-center py-0.5 px-2 text-gray-400 font-bold tracking-tight select-none border-b border-gray-800/45">
          <span className="mr-1.5 font-bold scale-90">🎮</span>
          <span>game</span>
        </div>
        
        {rootServices.map((service) => renderNode(service, 0))}
      </div>

      {/* Roblox Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute bg-[#222428] border border-[#1A1C1F] shadow-2xl py-1 z-50 min-w-[170px] text-gray-300 text-[11px] rounded font-sans"
          style={{ top: `${contextMenu.y - 100}px`, left: `${contextMenu.x - 10}px` }}
        >
          <div className="px-3 py-1 font-semibold text-gray-500 bg-[#1A1C1F]/40 border-b border-gray-800 text-[10px] uppercase">
            Actions: {instances[contextMenu.nodeId]?.name}
          </div>
          
          <button onClick={() => duplicateInstance(contextMenu.nodeId)} className="w-full text-left px-3 py-1.5 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Copy size={11} className="text-gray-400" />
            Duplicate
          </button>
          <button onClick={() => deleteInstance(contextMenu.nodeId)} className="w-full text-left px-3 py-1.5 hover:bg-[#3E4249] text-red-400 hover:text-red-300 flex items-center gap-2 transition">
            <Trash2 size={11} />
            Delete
          </button>
          
          <hr className="border-gray-800 my-1" />
          
          <div className="px-3 py-1 font-semibold text-gray-500 text-[9px] uppercase">Insert Child:</div>
          <button onClick={() => triggerInsert('Part', contextMenu.nodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Box size={11} className="text-[#00A2FF]" />
            Part (Block)
          </button>
          <button onClick={() => triggerInsert('Script', contextMenu.nodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Terminal size={11} className="text-orange-400" />
            Script
          </button>
          <button onClick={() => triggerInsert('Folder', contextMenu.nodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Folder size={11} className="text-yellow-500" fill="currentColor" />
            Folder
          </button>
          <button onClick={() => triggerInsert('Model', contextMenu.nodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Package size={11} className="text-amber-500" />
            Model
          </button>
        </div>
      )}

      {/* Inline Quick Insert popup */}
      {insertMenuNodeId && (
        <div
          className="absolute right-4 bg-[#222428] border border-[#1A1C1F] shadow-2xl py-1 z-50 min-w-[130px] text-gray-300 text-[11px] rounded"
          style={{ top: '30px' }}
        >
          <div className="px-3 py-1 text-gray-500 border-b border-gray-800 font-semibold text-[10px]">Insert Object:</div>
          <button onClick={() => triggerInsert('Part', insertMenuNodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Box size={11} className="text-blue-400" />
            Part
          </button>
          <button onClick={() => triggerInsert('Script', insertMenuNodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Terminal size={11} className="text-orange-400" />
            Script
          </button>
          <button onClick={() => triggerInsert('Folder', insertMenuNodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Folder size={11} className="text-yellow-500" fill="currentColor" />
            Folder
          </button>
          <button onClick={() => triggerInsert('Model', insertMenuNodeId)} className="w-full text-left px-3 py-1 hover:bg-[#3E4249] flex items-center gap-2 transition">
            <Package size={11} className="text-amber-500" />
            Model
          </button>
        </div>
      )}
    </div>
  );
}
