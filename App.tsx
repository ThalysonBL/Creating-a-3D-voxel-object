import React, { useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Voxel, AnimationState, PresetModel, GenerationStatus } from './types';
import { PRESETS } from './constants';
import { generateVoxelModel } from './services/geminiService';
import VoxelRenderer from './components/VoxelRenderer';
import Controls from './components/Controls';

// Component to handle camera reset logic
const CameraHandler = ({ trigger }: { trigger: number }) => {
  const { camera, controls } = useThree<any>();

  useEffect(() => {
    const targetPos = new THREE.Vector3(0, 6, 35);
    const targetLookAt = new THREE.Vector3(0, 2, 0);

    camera.position.copy(targetPos);
    camera.lookAt(targetLookAt);

    if (controls) {
      controls.target.copy(targetLookAt);
      controls.update();
    }
  }, [trigger, camera, controls]);

  return null;
};

const App: React.FC = () => {
  const [voxels, setVoxels] = useState<Voxel[]>(PRESETS[0].voxels);
  const [currentModelName, setCurrentModelName] = useState<string>(PRESETS[0].name);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(PRESETS[0].id);
  const [animationState, setAnimationState] = useState<AnimationState>(AnimationState.HIDDEN);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  
  const [isAssembled, setIsAssembled] = useState(false);
  
  // History State
  const [history, setHistory] = useState<PresetModel[]>([]);
  
  // Transition State
  const [pendingVoxels, setPendingVoxels] = useState<Voxel[] | null>(null);
  const [pendingModelName, setPendingModelName] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [modelVersion, setModelVersion] = useState(0);
  const [cameraResetTrigger, setCameraResetTrigger] = useState(0);

  // Load history from local storage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('voxelBuilderHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  const handleSelectPreset = (preset: PresetModel) => {
    setSelectedPresetId(preset.id);
    setPendingVoxels(preset.voxels);
    setPendingModelName(preset.name);
  };

  // Centralized logic to start a transition to a new model (Pending or Immediate)
  const startModelTransition = (newVoxels: Voxel[], newName: string) => {
    // Set these as pending so the transition logic can pick them up
    setPendingVoxels(newVoxels);
    setPendingModelName(newName);

    // Only break first if we are actually fully assembled. 
    // If we are COLLAPSED, HIDDEN, or ASSEMBLING, we can swap directly.
    // If DISASSEMBLING, we hook into the transition flag.
    if (animationState === AnimationState.ASSEMBLED) {
        setIsTransitioning(true);
        setAnimationState(AnimationState.DISASSEMBLING);
    } else if (animationState === AnimationState.DISASSEMBLING) {
        // Already breaking? Just ensure we transition when done.
        setIsTransitioning(true);
    } else {
        // If current model is broken (COLLAPSED) or hidden, swap instantly and build
        setVoxels(newVoxels);
        setCurrentModelName(newName);
        setPendingVoxels(null);
        setPendingModelName(null);
        setModelVersion(v => v + 1);
        setCameraResetTrigger(prev => prev + 1);
        
        setAnimationState(AnimationState.HIDDEN);
        setTimeout(() => {
            setAnimationState(AnimationState.ASSEMBLING);
        }, 50);
    }
  };

  const handleGenerate = async (prompt: string) => {
    setGenerationStatus('generating');
    
    try {
      const newVoxels = await generateVoxelModel(prompt);
      setGenerationStatus('success');
      setSelectedPresetId(null); // Deselect presets as we are using custom
      
      // Save to history
      const newModel: PresetModel = {
        id: `gen-${Date.now()}`,
        name: prompt,
        voxels: newVoxels
      };

      setHistory(prev => {
        const updated = [newModel, ...prev];
        // Limit history to last 20 items to save space
        const trimmed = updated.slice(0, 20);
        localStorage.setItem('voxelBuilderHistory', JSON.stringify(trimmed));
        return trimmed;
      });
      
      // Trigger the standard transition logic
      startModelTransition(newVoxels, prompt);
      
    } catch (error) {
      setGenerationStatus('error');
    }
  };

  const commitPendingModel = useCallback(() => {
    if (pendingVoxels && pendingModelName) {
        setVoxels(pendingVoxels);
        setCurrentModelName(pendingModelName);
        setPendingVoxels(null);
        setPendingModelName(null);
        setModelVersion(v => v + 1);
        setCameraResetTrigger(prev => prev + 1);
    }
  }, [pendingVoxels, pendingModelName]);

  const handleAssemble = () => {
    // If user clicked Assemble and we have a pending preset selected via UI
    if (pendingVoxels && pendingModelName) {
        startModelTransition(pendingVoxels, pendingModelName);
    } else {
        // Just re-assemble current if nothing new is pending
        setAnimationState(AnimationState.ASSEMBLING);
    }
  };

  const handleDisassemble = () => {
    setIsTransitioning(false);
    setAnimationState(AnimationState.DISASSEMBLING);
  };

  const handleAnimationComplete = useCallback(() => {
    if (animationState === AnimationState.ASSEMBLING) {
      setAnimationState(AnimationState.ASSEMBLED);
      setIsAssembled(true);
      setIsTransitioning(false);
    } else if (animationState === AnimationState.DISASSEMBLING) {
      if (isTransitioning) {
          // Transition Disassembly complete: Time to swap and build new
          commitPendingModel();
          
          setAnimationState(AnimationState.HIDDEN);
          
          requestAnimationFrame(() => {
              setTimeout(() => {
                setAnimationState(AnimationState.ASSEMBLING);
                setIsTransitioning(false);
              }, 100);
          });
      } else {
          setAnimationState(AnimationState.COLLAPSED);
          setIsAssembled(false);
      }
    }
  }, [animationState, isTransitioning, commitPendingModel]);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black overflow-hidden relative font-sans">
      
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 6, 35], fov: 40 }}>
        <CameraHandler trigger={cameraResetTrigger} />
        
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} target={[0, 2, 0]} />
        
        <Environment preset="city" />
        
        <ambientLight intensity={0.4} />
        
        <directionalLight 
          position={[15, 25, 15]} 
          intensity={1.8} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        >
          <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
        </directionalLight>
        
        <spotLight position={[-15, 10, 10]} intensity={0.8} angle={0.5} penumbra={1} color="#c4b5fd" />
        <spotLight position={[0, 15, -20]} intensity={1} angle={0.5} penumbra={1} color="#a5f3fc" />
        
        <VoxelRenderer 
          key={`${currentModelName}-${modelVersion}`}
          voxels={voxels} 
          animationState={animationState}
          onAnimationComplete={handleAnimationComplete}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <shadowMaterial transparent opacity={0.3} />
        </mesh>

        <ContactShadows 
            position={[0, 0, 0]} 
            opacity={0.6} 
            scale={50} 
            blur={2} 
            far={4} 
            resolution={512} 
            color="#000000" 
        />
        
      </Canvas>

      <Controls 
        onSelectPreset={handleSelectPreset}
        onGenerate={handleGenerate}
        onAssemble={handleAssemble}
        onDisassemble={handleDisassemble}
        currentModelName={currentModelName}
        selectedPresetId={selectedPresetId}
        generationStatus={generationStatus}
        isAssembled={isAssembled}
        hasPendingChanges={!!pendingVoxels}
        history={history}
      />

    </div>
  );
};

export default App;