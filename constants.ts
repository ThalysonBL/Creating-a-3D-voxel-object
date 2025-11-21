import { PresetModel, Voxel } from './types';

// Helper to generate high-res sphere
const generateSphere = (radius: number, mainColor: string): Voxel[] => {
    const voxels: Voxel[] = [];
    const r2 = radius * radius;
    
    // Helper for color variation
    const adjustColor = (hex: string, variance: number) => {
        // Simple mock color variation or just return same
        return hex; 
    };

    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            for (let z = -radius; z <= radius; z++) {
                const dist = x*x + y*y + z*z;
                if (dist <= r2) {
                    // Hollow out slightly for performance if needed, or keep solid for breaking effect
                    // Keeping solid for better breaking physics visuals
                    
                    // Simple shading logic based on height/position
                    let color = mainColor;
                    if (y > radius * 0.5) color = '#60a5fa'; // Lighter top
                    else if (y < -radius * 0.5) color = '#1e3a8a'; // Darker bottom
                    
                    voxels.push({ x, y, z, color });
                }
            }
        }
    }
    return voxels;
};

const SPHERE_VOXELS = generateSphere(6, '#3b82f6');

const CASTLE_VOXELS: Voxel[] = [
    // Simple base for a castle tower to keep file size sane but show structure
    // A 5x5 base, 10 high
    ...Array.from({ length: 10 }).flatMap((_, y) => 
        Array.from({ length: 5 }).flatMap((_, x) => 
            Array.from({ length: 5 }).map((_, z) => ({
                x: x - 2,
                y: y,
                z: z - 2,
                color: (x + z) % 2 === 0 ? '#94a3b8' : '#64748b' // Checker pattern bricks
            }))
        )
    ),
    // Crenellations
    { x: -2, y: 10, z: -2, color: '#cbd5e1' }, { x: 0, y: 10, z: -2, color: '#cbd5e1' }, { x: 2, y: 10, z: -2, color: '#cbd5e1' },
    { x: -2, y: 10, z: 2, color: '#cbd5e1' }, { x: 0, y: 10, z: 2, color: '#cbd5e1' }, { x: 2, y: 10, z: 2, color: '#cbd5e1' },
    { x: -2, y: 10, z: 0, color: '#cbd5e1' }, { x: 2, y: 10, z: 0, color: '#cbd5e1' },
];

// Generate a colorful 8x8x8 cube
const CUBE_VOXELS: Voxel[] = [];
for(let x=-4; x<4; x++) {
    for(let y=-4; y<4; y++) {
        for(let z=-4; z<4; z++) {
            const r = Math.floor(((x+4)/8) * 255);
            const g = Math.floor(((y+4)/8) * 255);
            const b = Math.floor(((z+4)/8) * 255);
            // Convert rgb to hex
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            CUBE_VOXELS.push({x, y, z, color: hex});
        }
    }
}

export const PRESETS: PresetModel[] = [
  { id: 'sphere', name: 'Esfera HD', voxels: SPHERE_VOXELS },
  { id: 'cube', name: 'Cubo RGB', voxels: CUBE_VOXELS },
  { id: 'castle', name: 'Torre', voxels: CASTLE_VOXELS },
];