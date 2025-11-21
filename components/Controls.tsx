import React, { useState, useRef } from 'react';
import { Box, Hammer, Sparkles, RotateCcw, Loader2, History, Cuboid, GripHorizontal, Trash2, X } from 'lucide-react';
import { PresetModel, GenerationStatus } from '../types';
import { PRESETS } from '../constants';

interface ControlsProps {
  onSelectPreset: (model: PresetModel) => void;
  onGenerate: (prompt: string) => void;
  onAssemble: () => void;
  onDisassemble: () => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
  currentModelName: string;
  selectedPresetId: string | null;
  generationStatus: GenerationStatus;
  isAssembled: boolean;
  hasPendingChanges?: boolean;
  history: PresetModel[];
}

type TabMode = 'presets' | 'create' | 'history';

const Controls: React.FC<ControlsProps> = ({
  onSelectPreset,
  onGenerate,
  onAssemble,
  onDisassemble,
  onClearHistory,
  onDeleteHistoryItem,
  currentModelName,
  selectedPresetId,
  generationStatus,
  isAssembled,
  hasPendingChanges = false,
  history,
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<TabMode>('presets');

  // Drag State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    
    setIsDragging(true);
    
    // Calculate offset: Mouse Position - Current Translate Value
    dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
  };

  const handleGenerateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleAssembleClick = () => {
    const isNewPrompt = prompt.trim() !== currentModelName;

    if (activeTab === 'create' && prompt.trim() && isNewPrompt) {
        handleGenerateSubmit();
    } else {
        onAssemble();
    }
  };

  const isInputDifferent = activeTab === 'create' && prompt.trim() !== currentModelName;
  
  const isAssembleDisabled = generationStatus === 'generating' || 
    (activeTab === 'create'
        ? !prompt.trim() || (!isInputDifferent && isAssembled && !hasPendingChanges)
        : (!hasPendingChanges && isAssembled));

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-center p-4 md:p-6 overflow-hidden">
      
      {/* Main Control Panel (Draggable) */}
      <div 
        className="bg-gray-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md pointer-events-auto transition-shadow duration-300 flex flex-col"
        style={{ 
            transform: `translate(${position.x}px, ${position.y}px)`,
            touchAction: 'none' // Prevent scrolling while dragging
        }}
      >
        
        {/* Header / Drag Handle */}
        <div 
          className={`flex justify-between items-center p-3 border-b border-gray-700 select-none bg-gray-800/50 rounded-t-2xl transition-colors
            ${isDragging ? 'cursor-grabbing bg-gray-700' : 'cursor-grab hover:bg-gray-800'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex items-center gap-3">
            <GripHorizontal size={20} className="text-gray-500" />
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Voxel Builder
            </h2>
          </div>
          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded truncate max-w-[120px] pointer-events-none">
            {currentModelName}
          </span>
        </div>

        {/* Content Area */}
        <div className="p-4">
            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-4 bg-gray-800 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-2 text-xs sm:text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-1
                ${activeTab === 'presets' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
            >
                <Box size={14} />
                Prontos
            </button>
            <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-xs sm:text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-1
                ${activeTab === 'create' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
            >
                <Sparkles size={14} />
                Criar
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 text-xs sm:text-sm rounded-lg transition-colors font-medium flex items-center justify-center gap-1
                ${activeTab === 'history' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
            >
                <History size={14} />
                Histórico
            </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[100px]">
            
            {/* Preset Selection */}
            {activeTab === 'presets' && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                {PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                    <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group
                        ${isSelected 
                            ? 'bg-blue-950 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105 z-10' 
                            : 'bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:border-gray-500 hover:scale-[1.02]'
                        }
                        `}
                    >
                        {isSelected && (
                        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-400/30 animate-pulse" />
                        )}
                        <Cuboid size={24} className={`mb-2 transition-transform duration-300 ${isSelected ? 'text-blue-400 scale-110' : 'text-gray-500 group-hover:text-blue-300'}`} />
                        <span className={`text-xs truncate w-full text-center font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {preset.name}
                        </span>
                    </button>
                    );
                })}
                </div>
            )}

            {/* Custom AI Generation */}
            {activeTab === 'create' && (
                <form onSubmit={handleGenerateSubmit} className="mb-4 flex flex-col h-full justify-center">
                <div className="flex gap-2">
                    <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Um castelo medieval..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    disabled={generationStatus === 'generating'}
                    onPointerDown={(e) => e.stopPropagation()} // Allow text selection without dragging
                    />
                    <button
                    type="submit"
                    disabled={generationStatus === 'generating' || !prompt.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:text-gray-500 text-white p-3 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                    onPointerDown={(e) => e.stopPropagation()}
                    >
                    {generationStatus === 'generating' ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    </button>
                </div>
                {generationStatus === 'error' && <p className="text-red-400 text-xs mt-2 font-medium text-center">Erro ao gerar. Tente novamente.</p>}
                <p className="text-gray-500 text-xs mt-3 text-center">Descreva um objeto para a IA montar bloco por bloco.</p>
                </form>
            )}

            {/* History Selection */}
            {activeTab === 'history' && (
                <div className="mb-4">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-gray-500 text-sm">
                    <History size={32} className="mb-2 opacity-20" />
                    <p>Nenhum modelo criado ainda.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-2 px-1">
                             <span className="text-xs text-gray-400">Seus modelos salvos</span>
                             <button 
                                onClick={onClearHistory}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                title="Limpar todo o histórico"
                             >
                                <Trash2 size={12} /> Limpar Tudo
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar" onPointerDown={(e) => e.stopPropagation()}>
                        {history.map((item) => {
                            const isSelected = selectedPresetId === item.id;
                            return (
                            <div key={item.id} className="relative group h-full">
                                <button
                                    onClick={() => onSelectPreset(item)}
                                    className={`w-full h-full relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200
                                    ${isSelected 
                                        ? 'bg-pink-950 border-2 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-105 z-10' 
                                        : 'bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:border-gray-500 hover:scale-[1.02]'
                                    }
                                    `}
                                >
                                    <Sparkles size={20} className={`mb-2 transition-transform duration-300 ${isSelected ? 'text-pink-400 scale-110' : 'text-gray-600 group-hover:text-pink-300'}`} />
                                    <span className={`text-xs line-clamp-2 w-full text-center font-medium leading-tight ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                    {item.name}
                                    </span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteHistoryItem(item.id);
                                    }}
                                    className="absolute top-1 right-1 p-1.5 bg-black/20 hover:bg-red-500/80 text-white/70 hover:text-white rounded-full backdrop-blur-sm transition-colors z-20"
                                    title="Excluir este item"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            );
                        })}
                        </div>
                    </>
                )}
                </div>
            )}
            </div>

            {/* Action Buttons (Assemble/Break) */}
            <div className="flex gap-3 mt-2 pt-2 border-t border-gray-800">
            <button
                onClick={handleAssembleClick}
                disabled={isAssembleDisabled}
                onPointerDown={(e) => e.stopPropagation()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95
                    ${isAssembleDisabled
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    }`}
            >
                {generationStatus === 'generating' ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        Gerando...
                    </>
                ) : (
                    <>
                        <Hammer size={18} />
                        {activeTab === 'create' && prompt.trim() && prompt.trim() !== currentModelName ? 'Gerar e Montar' : 'Montar'}
                    </>
                )}
            </button>
            
            <button
                onClick={onDisassemble}
                disabled={!isAssembled || generationStatus === 'generating'}
                onPointerDown={(e) => e.stopPropagation()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95
                    ${!isAssembled 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20'
                    }`}
            >
                <RotateCcw size={18} />
                Quebrar
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;