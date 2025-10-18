
import { ToothData, MeasurementType } from './types.ts';

// --- New Position Generation Logic ---
const ARCH_RADIUS_UPPER = 5.0;
const ARCH_RADIUS_LOWER = 4.5;
export const POSTERIOR_OFFSET = 2.5;

// Angles in degrees from the midline for each tooth in a quadrant (1=central incisor to 8=third molar)
const TOOTH_ANGLES_DEG = [5, 15, 25, 36, 47, 60, 73, 85];
const TOOTH_ANGLES_RAD = TOOTH_ANGLES_DEG.map(deg => deg * Math.PI / 180);

const positions: { [id: number]: { x: number; y: number; z: number; rotationY: number } } = {};

// Generate positions for all 32 teeth
// Universal Numbering: 1-16 Upper Arch, 17-32 Lower Arch
// 1-8: UR (viewer's top-left), 9-16: UL (viewer's top-right)
// 17-24: LL (viewer's bottom-right), 25-32: LR (viewer's bottom-left)

// Upper Arch (Teeth 1-16)
for (let i = 0; i < 8; i++) {
    // Quadrant 1 (Teeth 1-8, Patient's Upper Right)
    const toothIdQ1 = 8 - i;
    const angleQ1 = -TOOTH_ANGLES_RAD[i];
    positions[toothIdQ1] = {
        x: Math.sin(angleQ1) * ARCH_RADIUS_UPPER,
        y: 1.4,
        z: -Math.cos(angleQ1) * ARCH_RADIUS_UPPER + POSTERIOR_OFFSET,
        rotationY: angleQ1,
    };

    // Quadrant 2 (Teeth 9-16, Patient's Upper Left)
    const toothIdQ2 = 9 + i;
    const angleQ2 = TOOTH_ANGLES_RAD[i];
    positions[toothIdQ2] = {
        x: Math.sin(angleQ2) * ARCH_RADIUS_UPPER,
        y: 1.4,
        z: -Math.cos(angleQ2) * ARCH_RADIUS_UPPER + POSTERIOR_OFFSET,
        rotationY: angleQ2,
    };
}

// Lower Arch (Teeth 17-32)
for (let i = 0; i < 8; i++) {
    // Quadrant 4 (Teeth 17-24, Patient's Lower Left from their view -> viewer's bottom right)
    const toothIdQ4 = 24 - i;
    const angleQ4 = TOOTH_ANGLES_RAD[i]; // Positive X for viewer's bottom-right
    positions[toothIdQ4] = {
        x: Math.sin(angleQ4) * ARCH_RADIUS_LOWER,
        y: -1.6,
        z: -Math.cos(angleQ4) * ARCH_RADIUS_LOWER + POSTERIOR_OFFSET,
        rotationY: angleQ4,
    };

    // Quadrant 3 (Teeth 25-32, Patient's Lower Right from their view -> viewer's bottom left)
    const toothIdQ3 = 25 + i;
    const angleQ3 = -TOOTH_ANGLES_RAD[i]; // Negative X for viewer's bottom-left
    positions[toothIdQ3] = {
        x: Math.sin(angleQ3) * ARCH_RADIUS_LOWER,
        y: -1.6,
        z: -Math.cos(angleQ3) * ARCH_RADIUS_LOWER + POSTERIOR_OFFSET,
        rotationY: angleQ3,
    };
}

export const TOOTH_POSITIONS = positions;


// More detailed sample data for the Digital Twin
export const INITIAL_CHART_DATA: ToothData[] = Array.from({ length: 32 }, (_, i) => {
    const id = i + 1;
    const tooth: ToothData = {
        id: id,
        measurements: {
            [MeasurementType.POCKET_DEPTH]: {},
            [MeasurementType.RECESSION]: {},
            [MeasurementType.BLEEDING]: {},
            [MeasurementType.PLAQUE]: {},
        },
    };

    // Add some interesting sample data
    if (id === 3) {
        tooth.measurements[MeasurementType.POCKET_DEPTH] = { disto_buccal: 4, mid_buccal: 5, mesio_buccal: 4 };
        tooth.measurements[MeasurementType.RECESSION] = { disto_buccal: 1, mid_buccal: 2, mesio_buccal: 1 };
        tooth.measurements[MeasurementType.BLEEDING] = { mid_buccal: true };
    }
    if (id === 7) {
        tooth.measurements[MeasurementType.POCKET_DEPTH] = { disto_lingual: 4, mid_lingual: 4, mesio_lingual: 5 };
        tooth.measurements[MeasurementType.RECESSION] = { disto_lingual: 2, mid_lingual: 3, mesio_lingual: 2 };
        tooth.measurements[MeasurementType.PLAQUE] = { mid_lingual: true };
    }
     if (id === 14) {
        tooth.measurements[MeasurementType.POCKET_DEPTH] = { mid_buccal: 7, disto_buccal: 6, mesio_buccal: 6 };
        tooth.measurements[MeasurementType.RECESSION] = { mid_buccal: 3, disto_buccal: 2, mesio_buccal: 2 };
        tooth.measurements[MeasurementType.BLEEDING] = { mid_buccal: true, disto_buccal: true };
        tooth.furcation = { buccal: 1 };
    }
    if (id === 19) {
        tooth.mobility = 1;
        tooth.measurements[MeasurementType.POCKET_DEPTH] = { mid_buccal: 5, mid_lingual: 6 };
        tooth.measurements[MeasurementType.RECESSION] = { mid_buccal: 3, mid_lingual: 3 };
        tooth.measurements[MeasurementType.BLEEDING] = { mid_lingual: true };
    }
    if (id === 30) {
        tooth.furcation = { buccal: 2 };
        tooth.mobility = 2;
        tooth.measurements[MeasurementType.POCKET_DEPTH] = { disto_buccal: 6, mid_buccal: 8, mesio_buccal: 6 };
        tooth.measurements[MeasurementType.RECESSION] = { disto_buccal: 3, mid_buccal: 4, mesio_buccal: 3 };
        tooth.measurements[MeasurementType.BLEEDING] = { mid_buccal: true, disto_buccal: true, mesio_buccal: true };
        tooth.measurements[MeasurementType.PLAQUE] = { mid_buccal: true, disto_buccal: true, mesio_buccal: true };
    }
    
    // Mark some teeth as missing
    if (id === 1 || id === 16 || id === 17 || id === 32) {
        tooth.isMissing = true;
    }
    
    return tooth;
});

export const getToothType = (id: number): 'molar' | 'premolar' | 'canine' | 'incisor' => {
  const toothNumInQuad = (id - 1) % 8; // 0 to 7
  const toothPos = (id <= 16) ? toothNumInQuad : 7 - toothNumInQuad; // 0=molar, 7=incisor for upper; reverse for lower
  if (id > 8 && id < 17) { // Q2
      if ([0,1,2].includes(toothNumInQuad)) return 'molar';
      if ([3,4].includes(toothNumInQuad)) return 'premolar';
      if ([5].includes(toothNumInQuad)) return 'canine';
      return 'incisor';
  }
   if (id > 24 && id <= 32) { // Q3
      if ([0,1,2].includes(toothNumInQuad)) return 'molar';
      if ([3,4].includes(toothNumInQuad)) return 'premolar';
      if ([5].includes(toothNumInQuad)) return 'canine';
      return 'incisor';
  }

  // Q1 and Q4 are reversed
  if ([0, 1, 2].includes(toothPos)) return 'incisor';
  if (toothPos === 3) return 'canine';
  if ([4, 5].includes(toothPos)) return 'premolar';
  return 'molar';
};

/**
 * Converts quadrant-based notation to the Universal Numbering System (1-32).
 * Follows the user-specified quadrant system (from viewer's perspective):
 * Q1: Top-Left (Patient's UR)
 * Q2: Top-Right (Patient's UL)
 * Q3: Bottom-Left (Patient's LR)
 * Q4: Bottom-Right (Patient's LL)
 * In all quadrants, tooth 1 is the central incisor, 8 is the 3rd molar.
 */
export const getUniversalToothId = (quadrant: number, toothInQuad: number): number | null => {
    if (quadrant < 1 || quadrant > 4 || toothInQuad < 1 || toothInQuad > 8) return null;
    switch (quadrant) {
        case 1: return 9 - toothInQuad;   // Q1 (Top-Left): T1=8, T2=7... T8=1
        case 2: return 8 + toothInQuad;   // Q2 (Top-Right): T1=9, T2=10... T8=16
        case 3: return 24 + toothInQuad;  // Q3 (Bottom-Left): T1=25, T2=26... T8=32
        case 4: return 25 - toothInQuad;  // Q4 (Bottom-Right): T1=24, T2=23... T8=17
        default: return null;
    }
};

/**
 * Converts a Universal Tooth ID (1-32) to its Palmer Quadrant notation.
 * Returns the quadrant (1-4, viewer's perspective) and tooth number (1-8 from midline).
 */
export const getPalmerNotation = (universalId: number): { quadrant: number; toothInQuad: number } | null => {
    if (universalId < 1 || universalId > 32) return null;

    if (universalId >= 1 && universalId <= 8) { // Quadrant 1 (UR)
        return { quadrant: 1, toothInQuad: 9 - universalId };
    }
    if (universalId >= 9 && universalId <= 16) { // Quadrant 2 (UL)
        return { quadrant: 2, toothInQuad: universalId - 8 };
    }
    if (universalId >= 17 && universalId <= 24) { // Quadrant 4 (LL)
        return { quadrant: 4, toothInQuad: 25 - universalId };
    }
    if (universalId >= 25 && universalId <= 32) { // Quadrant 3 (LR)
        return { quadrant: 3, toothInQuad: universalId - 24 };
    }
    return null; // Should be unreachable
};
