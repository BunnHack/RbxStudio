/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, ArrowRight } from 'lucide-react';
import { LogMessage } from '../types';

interface OutputConsoleProps {
  state: ReturnType<typeof import('../hooks/useRobloxState').useRobloxState>;
}

type ConsoleFilter = 'All' | 'Script' | 'System' | 'Errors';

export default function OutputConsole({ state }: OutputConsoleProps) {
  const { outputLogs, clearLogs, executeCommand } = state;

  const [activeFilter, setActiveFilter] = useState<ConsoleFilter>('All');
  const [commandInput, setCommandInput] = useState('');
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output when logs arrive
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputLogs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    executeCommand(commandInput);
    setCommandInput('');
  };

  const getFilteredLogs = (): LogMessage[] => {
    switch (activeFilter) {
      case 'Script':
        return outputLogs.filter((log) => log.text.includes('['));
      case 'System':
        return outputLogs.filter((log) => !log.text.includes('[') && log.type !== 'error');
      case 'Errors':
        return outputLogs.filter((log) => log.type === 'error' || log.text.includes('ERROR'));
      default:
        return outputLogs;
    }
  };

  const getLogStyle = (type: LogMessage['type'], text: string) => {
    if (text.includes('ERROR') || type === 'error') {
      return 'text-red-400 font-semibold';
    }
    if (text.includes('WARNING') || type === 'warn') {
      return 'text-amber-400';
    }
    if (type === 'success') {
      return 'text-green-400 font-medium';
    }
    if (text.startsWith('>')) {
      return 'text-cyan-400 font-bold';
    }
    return 'text-gray-300';
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="h-full bg-[#1A1C1F] flex flex-col font-mono text-[11px] border-t border-[#151619] select-text">
      
      {/* Console Tab header */}
      <div className="flex bg-[#25282D] border-b border-gray-800 px-3 items-center justify-between select-none py-1">
        <div className="flex gap-2.5 items-center">
          <Terminal size={12} className="text-gray-500" />
          <span className="font-semibold text-[10px] text-gray-400 tracking-wider uppercase mr-2">Output Log</span>
          
          {(['All', 'Script', 'System', 'Errors'] as ConsoleFilter[]).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2 py-0.5 rounded transition ${
                  isSelected
                    ? 'bg-[#1E2024] text-white font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#2D3035]/50'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Clear log trigger */}
        <button
          onClick={clearLogs}
          title="Clear logs"
          className="p-1 hover:bg-[#3E4249] text-gray-500 hover:text-red-400 rounded transition"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Logs feed Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1.5 scrollbar-thin">
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex gap-3 leading-relaxed border-b border-gray-900/10 py-0.5">
            <span className="text-gray-600 shrink-0 select-none">{log.timestamp}</span>
            <span className={`break-all ${getLogStyle(log.type, log.text)}`}>{log.text}</span>
          </div>
        ))}
        
        {filteredLogs.length === 0 && (
          <div className="text-center text-gray-600 py-10 select-none">
            No output messages to display for this filter.
          </div>
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Command Line Bar */}
      <form
        onSubmit={handleCommandSubmit}
        className="flex items-center bg-[#151619] border-t border-gray-800 px-3 py-1.5 gap-2 select-none"
      >
        <span className="text-cyan-400 font-black text-xs">&gt;</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Command Bar - Enter Luau or JS statements (e.g. Instance.new('Part') or print('Hello'))"
          className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-white text-[11px] placeholder-gray-600 font-mono"
        />
        <button
          type="submit"
          className="p-1 hover:bg-[#3E4249] rounded text-gray-500 hover:text-cyan-400 transition"
        >
          <ArrowRight size={12} />
        </button>
      </form>

    </div>
  );
}
