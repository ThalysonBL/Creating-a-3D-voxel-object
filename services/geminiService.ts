import { GoogleGenAI, Type } from "@google/genai";
import { Voxel } from '../types';

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVoxelModel = async (prompt: string): Promise<Voxel[]> => {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a highly detailed 3D voxel model of: ${prompt}. 
      
      Requirements:
      - Orientation: Y axis is vertical (UP). The object MUST be standing upright, not lying on its side.
      - The model must be centered around 0,0,0.
      - Use a high resolution grid. Aim for 800 to 2000 blocks to create a realistic 3D shape.
      - Use realistic shading and varied colors to add depth and detail.
      - Output format must be a compact array of arrays: [x, y, z, hexColorString].
      - Do not output objects, only the array of values to save space.
      - Ensure the structure is solid and recognizable.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            voxels: {
              type: Type.ARRAY,
              description: "List of voxels where each item is [x, y, z, color]",
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING, // Mixed types not fully supported in schema definition sometimes, treating as string/number mix implicitly or ANY
                }
              },
            },
          },
          required: ["voxels"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    const data = JSON.parse(text);
    
    // Parse the compact array format [x, y, z, color] back to Voxel objects
    return data.voxels.map((v: any) => ({
      x: Number(v[0]),
      y: Number(v[1]),
      z: Number(v[2]),
      color: String(v[3])
    }));

  } catch (error) {
    console.error("Error generating model:", error);
    throw error;
  }
};