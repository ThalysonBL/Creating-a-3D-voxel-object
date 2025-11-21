import React, { useState } from 'react';
import { Box, Hammer, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { PresetModel, GenerationStatus } from '../types';
import { PRESETS } from '../constants';

interface ControlsProps {
  onSelectPreset: (model: PresetModel) => void;
  onGenerate: (prompt: string) => void;
  onAssemble: () => void;
  onDisassemble: () => void;
  currentModelName: string;
  selectedPresetId: string | null;
  generationStatus: GenerationStatus;
  isAssembled: boolean;
  hasPendingChanges?: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  onSelectPreset,
  onGenerate,
  onAssemble,
  onDisassemble,
  currentModelName,
  selectedPresetId,
  generationStatus,
  isAssembled,
  hasPendingChanges = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const handleGenerateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleAssembleClick = () => {
    if (isCustomMode && prompt.trim()) {
        // In custom mode with text, Assemble button acts as Generate & Assemble
        handleGenerateSubmit();
    } else {
        // Normal assemble logic
        onAssemble();
    }
  };

  // Determine if the assemble button is active
  const isAssembleDisabled = generationStatus === 'generating' || 
    // If Custom Mode: disable if empty. If NOT Custom Mode: disable if assembled AND no pending changes
    (isCustomMode ? !prompt.trim() : (!hasPendingChanges && isAssembled));

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10 pointer-events-none flex flex-col items-center justify-end space-y-4">
      
      {/* Main Control Panel */}
      <div className="bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md pointer-events-auto transition-all duration-300">
        
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Voxel Builder
          </h2>
          <span className="text-xs text-gray-400 px-2 py-1 bg-gray-800 rounded">
            {currentModelName}
          </span>
        </div>

        <div className="flex space-x-2 mb-4">
          <button 
            onClick={() => setIsCustomMode(false)}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors font-medium ${!isCustomMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Modelos Prontos
          </button>
          <button 
            onClick={() => setIsCustomMode(true)}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors font-medium ${isCustomMode ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Criar com IA
          </button>
        </div>

        {/* Preset Selection */}
        {!isCustomMode && (
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
                  <Box size={24} className={`mb-2 transition-transform duration-300 ${isSelected ? 'text-blue-400 scale-110' : 'text-gray-500 group-hover:text-blue-300'}`} />
                  <span className={`text-xs truncate w-full text-center font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom AI Generation */}
        {isCustomMode && (
          <form onSubmit={handleGenerateSubmit} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Um castelo medieval..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                disabled={generationStatus === 'generating'}
              />
              <button
                type="submit"
                disabled={generationStatus === 'generating' || !prompt.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:text-gray-500 text-white p-3 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(147,51,234,0.5)]"
              >
                {generationStatus === 'generating' ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              </button>
            </div>
            {generationStatus === 'error' && <p className="text-red-400 text-xs mt-2 font-medium">Erro ao gerar. Tente novamente.</p>}
          </form>
        )}

        {/* Action Buttons (Assemble/Break) */}
        <div className="flex gap-3 mt-2 pt-2 border-t border-gray-800">
          <button
            onClick={handleAssembleClick}
            disabled={isAssembleDisabled}
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
                    Montar
                </>
            )}
          </button>
          
          <button
            onClick={onDisassemble}
            disabled={!isAssembled || generationStatus === 'generating'}
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
  );
};

export default Controls;