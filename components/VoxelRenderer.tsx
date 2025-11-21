import React, { useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Voxel, AnimationState } from '../types';

interface VoxelRendererProps {
  voxels: Voxel[];
  animationState: AnimationState;
  onAnimationComplete?: () => void;
}

// Physics constants
const GRAVITY = 20;
const BOUNCE_FACTOR = 0.3;
const FRICTION = 0.95;
const EXPLOSION_FORCE = 12;
const ROTATION_DAMPING = 0.98;
const DISASSEMBLY_TIMEOUT_MS = 3000; // Force complete after 3 seconds

interface ParticleData {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  isSleeping: boolean;
}

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const tempVec3 = new THREE.Vector3();

const VoxelRenderer: React.FC<VoxelRendererProps> = ({ 
  voxels, 
  animationState,
  onAnimationComplete 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Store current physics state for every voxel
  const particles = useRef<ParticleData[]>([]);
  
  // Track animation progress for assembling
  const assemblyProgress = useRef(0);
  const lastState = useRef<AnimationState>(AnimationState.HIDDEN);
  
  // Timer ref to force completion if physics never settles
  const disassemblyTimeoutRef = useRef<number | null>(null);

  // Keep latest callback stable for useFrame
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  // Geometry reusable
  const geometry = useMemo(() => new THREE.BoxGeometry(0.96, 0.96, 0.96), []);

  // Calculate Model Centering & Floor Level
  const { offset, floorY } = useMemo(() => {
    if (voxels.length === 0) return { offset: [0,0,0] as [number,number,number], floorY: 0 };
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    voxels.forEach(v => {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
    });

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    
    return { 
        offset: [-centerX, -minY + 0.5, -centerZ] as [number, number, number],
        floorY: minY 
    };
  }, [voxels]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
        if (disassemblyTimeoutRef.current) clearTimeout(disassemblyTimeoutRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    // Ensure particles array matches voxels length
    // When this component remounts (due to key change in App), this is fresh.
    if (particles.current.length !== voxels.length) {
        particles.current = voxels.map(v => ({
            position: new THREE.Vector3(v.x, v.y, v.z),
            quaternion: new THREE.Quaternion(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            isSleeping: false,
        }));
    }

    // Reset colors
    voxels.forEach((voxel, i) => {
      tempColor.set(voxel.color);
      meshRef.current!.setColorAt(i, tempColor);
    });
    meshRef.current.instanceColor!.needsUpdate = true;

    // Handle State Changes
    if (animationState === AnimationState.HIDDEN) {
        voxels.forEach((_, i) => {
            tempObject.scale.set(0,0,0);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
            
            // Reset particles to center
            particles.current[i].position.set(0, 0, 0);
            particles.current[i].quaternion.set(0, 0, 0, 1);
            particles.current[i].velocity.set(0, 0, 0);
            particles.current[i].angularVelocity.set(0, 0, 0);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    } 
    else if (animationState === AnimationState.ASSEMBLED) {
        // Force exact position alignment
        voxels.forEach((v, i) => {
            tempObject.position.set(v.x, v.y, v.z);
            tempObject.rotation.set(0,0,0);
            tempObject.scale.set(1,1,1);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
            
            // Lock physics
            const p = particles.current[i];
            p.position.set(v.x, v.y, v.z);
            p.quaternion.set(0,0,0,1);
            p.velocity.set(0,0,0);
            p.angularVelocity.set(0,0,0);
            p.isSleeping = true;
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Trigger Explosion logic
    if (animationState === AnimationState.DISASSEMBLING && lastState.current !== AnimationState.DISASSEMBLING) {
        voxels.forEach((v, i) => {
            const p = particles.current[i];
            
            // Reset before exploding to ensure they start from correct shape
            p.position.set(v.x, v.y, v.z);
            p.quaternion.set(0,0,0,1);
            p.isSleeping = false;

            const dx = v.x - (voxels.length > 0 ? (-offset[0]) : 0); 
            const dz = v.z - (voxels.length > 0 ? (-offset[2]) : 0);
            
            const horizontalDir = new THREE.Vector3(dx, 0, dz).normalize();
            if (horizontalDir.lengthSq() === 0) horizontalDir.set(Math.random()-0.5, 0, Math.random()-0.5).normalize();

            const randomForce = EXPLOSION_FORCE * (0.8 + Math.random() * 0.8);
            
            p.velocity.copy(horizontalDir).multiplyScalar(randomForce);
            p.velocity.y = 5 + Math.random() * 8; 

            p.angularVelocity.set(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15
            );
        });

        // Set safety timeout
        if (disassemblyTimeoutRef.current) clearTimeout(disassemblyTimeoutRef.current);
        disassemblyTimeoutRef.current = window.setTimeout(() => {
            onAnimationCompleteRef.current?.();
        }, DISASSEMBLY_TIMEOUT_MS);
    } 
    else if (animationState === AnimationState.ASSEMBLING && lastState.current !== AnimationState.ASSEMBLING) {
        assemblyProgress.current = 0;
        particles.current.forEach(p => p.isSleeping = false);
    }

    lastState.current = animationState;

  }, [voxels, animationState, offset]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const dt = Math.min(delta, 0.04);

    if (animationState === AnimationState.DISASSEMBLING || animationState === AnimationState.COLLAPSED) {
        let activeParticles = 0;

        for (let i = 0; i < voxels.length; i++) {
            const p = particles.current[i];
            if (p.isSleeping) continue;
            
            activeParticles++;

            p.velocity.y -= GRAVITY * dt;
            p.velocity.multiplyScalar(0.995);
            p.angularVelocity.multiplyScalar(ROTATION_DAMPING);

            p.position.addScaledVector(p.velocity, dt);

            const rotStep = p.angularVelocity.clone().multiplyScalar(dt);
            const qStep = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotStep.x, rotStep.y, rotStep.z));
            p.quaternion.multiply(qStep);

            if (p.position.y < floorY + 0.5) {
                p.position.y = floorY + 0.5;
                
                if (p.velocity.y < 0) {
                    p.velocity.y = -p.velocity.y * BOUNCE_FACTOR;
                    p.velocity.x *= FRICTION;
                    p.velocity.z *= FRICTION;
                    
                    const speedH = Math.sqrt(p.velocity.x**2 + p.velocity.z**2);
                    if (speedH > 0.5) {
                        p.angularVelocity.x += p.velocity.z * 2 * dt;
                        p.angularVelocity.z -= p.velocity.x * 2 * dt;
                    }
                }
                
                if (Math.abs(p.velocity.y) < 0.1 && p.velocity.lengthSq() < 0.1) {
                    p.isSleeping = true;
                }
            }

            tempObject.position.copy(p.position);
            tempObject.quaternion.copy(p.quaternion);
            tempObject.scale.set(1, 1, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        }
        
        if (activeParticles > 0) {
            meshRef.current.instanceMatrix.needsUpdate = true;
        } else if (animationState === AnimationState.DISASSEMBLING) {
            // Only trigger completion if explicitly in DISASSEMBLING state (not just resting in COLLAPSED)
            // And clear the timeout since we finished naturally
             if (disassemblyTimeoutRef.current) {
                clearTimeout(disassemblyTimeoutRef.current);
                disassemblyTimeoutRef.current = null;
            }
            onAnimationCompleteRef.current?.();
        }

    } else if (animationState === AnimationState.ASSEMBLING) {
        // Increment progress
        assemblyProgress.current += dt * 0.8;
        
        // Clamp progress to 1
        const t = Math.min(assemblyProgress.current, 1);
        const ease = 1 - Math.pow(1 - t, 4);

        for (let i = 0; i < voxels.length; i++) {
            const p = particles.current[i];
            const target = voxels[i];
            
            tempVec3.lerpVectors(p.position, new THREE.Vector3(target.x, target.y, target.z), ease);
            
            const targetQ = new THREE.Quaternion();
            const currentQ = p.quaternion.clone().slerp(targetQ, ease);

            tempObject.position.copy(tempVec3);
            tempObject.quaternion.copy(currentQ);
            tempObject.scale.set(ease, ease, ease);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;

        // Check if complete
        if (t >= 1) {
            onAnimationCompleteRef.current?.();
        }
    }
  });

  return (
    <group>
        <instancedMesh
        ref={meshRef}
        args={[geometry, undefined, voxels.length]}
        position={offset} 
        castShadow
        receiveShadow
        frustumCulled={false} // IMPORTANT: Prevents object from vanishing during animation/particle scatter
        >
        <meshStandardMaterial 
            roughness={0.2} 
            metalness={0.1} 
            envMapIntensity={1.2}
        />
        </instancedMesh>
    </group>
  );
};

export default VoxelRenderer;