// src/components/TitleBar.jsx
import React from 'react';
import { Minus, Square, X, Terminal } from 'lucide-react';

const TitleBar = () => {
  
  const sendCommand = (cmd) => {
    if (window.require) {
        try {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send(cmd);
        } catch (error) {
            console.error("Error sending Electron command:", error);
        }
    } else {
        console.warn("Electron environment not found. Command:", cmd);
    }
  };

  return (
    <div className="h-8 bg-[#09090b] flex items-center justify-between px-3 select-none border-b border-[#222] w-full app-drag-region flex-shrink-0">
        
        {/* Left: Title */}
        <div className="flex items-center gap-2 text-[#555]">
            <Terminal size={12} className="text-[#FF6B35]" />
            <span className="text-[10px] font-mono tracking-widest uppercase">RETROGRADE // Ver 1.1</span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1 app-no-drag">
            
            <button 
                onClick={() => sendCommand('window-minimize')} 
                className="p-1 hover:bg-[#333] text-[#888] hover:text-white rounded-sm transition-colors app-no-drag"
                title="Minimize"
            >
                <Minus size={14} />
            </button>

            <button 
                onClick={() => sendCommand('window-maximize')} 
                className="p-1 hover:bg-[#333] text-[#888] hover:text-white rounded-sm transition-colors app-no-drag"
                title="Maximize"
            >
                <Square size={12} />
            </button>

            <button 
                onClick={() => sendCommand('window-close')} 
                className="p-1 hover:bg-[#FF6B35] text-[#888] hover:text-black rounded-sm transition-colors group app-no-drag"
                title="Close"
            >
                <X size={14} />
            </button>
        </div>
    </div>
  );
};

export default TitleBar;