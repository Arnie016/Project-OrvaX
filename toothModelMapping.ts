/**
 * Tooth Model Mapping Configuration
 * Maps each tooth ID (1-32) to its corresponding .glb model file
 * and whether it should be mirrored horizontally
 */

export interface ToothModelConfig {
  toothId: number;
  modelFile: string;
  shouldMirror: boolean;
  name: string;
}

// Tooth model mapping based on the assembly order
export const TOOTH_MODEL_MAPPING: ToothModelConfig[] = [
  // Upper Arch - Right Side (Teeth 1-8)
  { toothId: 1, modelFile: 'public/maxillary_third_molar.glb', shouldMirror: true, name: 'Upper Right Third Molar' },
  { toothId: 2, modelFile: 'public/maxillary_second_molar.glb', shouldMirror: true, name: 'Upper Right Second Molar' },
  { toothId: 3, modelFile: 'public/maxillary_first_molar.glb', shouldMirror: true, name: 'Upper Right First Molar' },
  { toothId: 4, modelFile: 'public/maxillary_second_premolar.glb', shouldMirror: true, name: 'Upper Right Second Premolar' },
  { toothId: 5, modelFile: 'public/maxillary_first_premolar.glb', shouldMirror: true, name: 'Upper Right First Premolar' },
  { toothId: 6, modelFile: 'public/maxillary_canine.glb', shouldMirror: true, name: 'Upper Right Canine' },
  { toothId: 7, modelFile: 'public/maxillary_lateral_incisor.glb', shouldMirror: true, name: 'Upper Right Lateral Incisor' },
  { toothId: 8, modelFile: 'public/maxillary_left_central_incisor.glb', shouldMirror: true, name: 'Upper Right Central Incisor' },
  
  // Upper Arch - Left Side (Teeth 9-16)
  { toothId: 9, modelFile: 'public/maxillary_left_central_incisor.glb', shouldMirror: false, name: 'Upper Left Central Incisor' },
  { toothId: 10, modelFile: 'public/maxillary_lateral_incisor.glb', shouldMirror: false, name: 'Upper Left Lateral Incisor' },
  { toothId: 11, modelFile: 'public/maxillary_canine.glb', shouldMirror: false, name: 'Upper Left Canine' },
  { toothId: 12, modelFile: 'public/maxillary_first_premolar.glb', shouldMirror: false, name: 'Upper Left First Premolar' },
  { toothId: 13, modelFile: 'public/maxillary_second_premolar.glb', shouldMirror: false, name: 'Upper Left Second Premolar' },
  { toothId: 14, modelFile: 'public/maxillary_first_molar.glb', shouldMirror: false, name: 'Upper Left First Molar' },
  { toothId: 15, modelFile: 'public/maxillary_second_molar.glb', shouldMirror: false, name: 'Upper Left Second Molar' },
  { toothId: 16, modelFile: 'public/maxillary_third_molar.glb', shouldMirror: false, name: 'Upper Left Third Molar' },
  
  // Lower Arch - Left Side (Teeth 17-24)
  { toothId: 17, modelFile: 'public/mandibular_third_molar.glb', shouldMirror: false, name: 'Lower Left Third Molar' },
  { toothId: 18, modelFile: 'public/mandibular_second_molar.glb', shouldMirror: false, name: 'Lower Left Second Molar' },
  { toothId: 19, modelFile: 'public/mandibular_first_molar.glb', shouldMirror: false, name: 'Lower Left First Molar' },
  { toothId: 20, modelFile: 'public/mandibular_left_second_premolar.glb', shouldMirror: false, name: 'Lower Left Second Premolar' },
  { toothId: 21, modelFile: 'public/mandibular_first_premolar.glb', shouldMirror: false, name: 'Lower Left First Premolar' },
  { toothId: 22, modelFile: 'public/mandibular_left_canine.glb', shouldMirror: false, name: 'Lower Left Canine' },
  { toothId: 23, modelFile: 'public/mandibular_left_lateral_incisor.glb', shouldMirror: false, name: 'Lower Left Lateral Incisor' },
  { toothId: 24, modelFile: 'public/mandibular_left_central_incisor.glb', shouldMirror: false, name: 'Lower Left Central Incisor' },
  
  // Lower Arch - Right Side (Teeth 25-32)
  { toothId: 25, modelFile: 'public/mandibular_left_central_incisor.glb', shouldMirror: true, name: 'Lower Right Central Incisor' },
  { toothId: 26, modelFile: 'public/mandibular_left_lateral_incisor.glb', shouldMirror: true, name: 'Lower Right Lateral Incisor' },
  { toothId: 27, modelFile: 'public/mandibular_left_canine.glb', shouldMirror: true, name: 'Lower Right Canine' },
  { toothId: 28, modelFile: 'public/mandibular_first_premolar.glb', shouldMirror: true, name: 'Lower Right First Premolar' },
  { toothId: 29, modelFile: 'public/mandibular_left_second_premolar.glb', shouldMirror: true, name: 'Lower Right Second Premolar' },
  { toothId: 30, modelFile: 'public/mandibular_first_molar.glb', shouldMirror: true, name: 'Lower Right First Molar' },
  { toothId: 31, modelFile: 'public/mandibular_second_molar.glb', shouldMirror: true, name: 'Lower Right Second Molar' },
  { toothId: 32, modelFile: 'public/mandibular_third_molar.glb', shouldMirror: true, name: 'Lower Right Third Molar' },
];

// Helper function to get model config for a specific tooth
export const getToothModelConfig = (toothId: number): ToothModelConfig | undefined => {
  return TOOTH_MODEL_MAPPING.find(config => config.toothId === toothId);
};

// Default transformation values for each tooth (can be customized per tooth)
export interface ToothTransform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

// Storage key for persisting transformations
export const TOOTH_TRANSFORMS_STORAGE_KEY = 'tooth_transforms';

// Get default transform
export const getDefaultTransform = (): ToothTransform => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 0.1, y: 0.1, z: 0.1 }, // GLB models are often much larger, scale them down
});

// Load saved transformations from localStorage
export const loadToothTransforms = (): { [toothId: number]: ToothTransform } => {
  try {
    const saved = localStorage.getItem(TOOTH_TRANSFORMS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load tooth transforms:', error);
    return {};
  }
};

// Save transformations to localStorage
export const saveToothTransforms = (transforms: { [toothId: number]: ToothTransform }): void => {
  try {
    localStorage.setItem(TOOTH_TRANSFORMS_STORAGE_KEY, JSON.stringify(transforms));
  } catch (error) {
    console.error('Failed to save tooth transforms:', error);
  }
};

