export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

export enum AnimationState {
  IDLE = 'IDLE',
  ASSEMBLING = 'ASSEMBLING',
  ASSEMBLED = 'ASSEMBLED',
  DISASSEMBLING = 'DISASSEMBLING',
  COLLAPSED = 'COLLAPSED',
  HIDDEN = 'HIDDEN',
}

export interface PresetModel {
  id: string;
  name: string;
  voxels: Voxel[];
}

export type GenerationStatus = 'idle' | 'generating' | 'error' | 'success';