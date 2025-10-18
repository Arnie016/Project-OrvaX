import { MeasurementType, MeasurementLocation, MeasurementSiteValue } from './types';

export interface DbMeasurement {
  id: string;
  patient_id: string;
  visit_id: string;
  session_id: string;
  type: string;
  quadrant: number;
  surface: string;
  tooth_in_quadrant: number;
  distal: number | null;
  middle: number | null;
  mesial: number | null;
  value?: boolean | null;  // For bleeding/plaque
  created_at: string;
}

/**
 * Convert quadrant (1-4) and tooth_in_quadrant (1-8) to universal tooth number (1-32)
 */
export const getUniversalToothNumber = (quadrant: number, toothInQuadrant: number): number => {
  // Quadrant 1 (upper right): teeth 1-8
  // Quadrant 2 (upper left): teeth 9-16
  // Quadrant 3 (lower left): teeth 17-24
  // Quadrant 4 (lower right): teeth 25-32
  
  switch (quadrant) {
    case 1: return 9 - toothInQuadrant;        // Q1: tooth 1 → #8, tooth 8 → #1
    case 2: return 8 + toothInQuadrant;        // Q2: tooth 1 → #9, tooth 8 → #16
    case 3: return 25 - toothInQuadrant;       // Q3: tooth 1 → #24, tooth 8 → #17
    case 4: return 24 + toothInQuadrant;       // Q4: tooth 1 → #25, tooth 8 → #32
    default: return -1;
  }
};

/**
 * Map database type string to MeasurementType enum
 */
export const mapDbTypeToMeasurementType = (dbType: string): MeasurementType | null => {
  const cleanType = dbType.replace('=', '').toLowerCase();
  
  switch (cleanType) {
    case 'pocketdepth':
    case 'pocket_depth':
      return MeasurementType.POCKET_DEPTH;
    case 'recession':
      return MeasurementType.RECESSION;
    case 'bleeding':
    case 'bleeding_on_probing':
      return MeasurementType.BLEEDING;
    case 'plaque':
      return MeasurementType.PLAQUE;
    default:
      return null;
  }
};

/**
 * Map database surface and site to MeasurementLocation
 */
export const mapDbSurfaceToLocation = (surface: string, site: 'distal' | 'middle' | 'mesial'): MeasurementLocation => {
  const cleanSurface = surface.replace('=', '').toLowerCase();
  
  const prefix = site === 'distal' ? 'disto' : site === 'middle' ? 'mid' : 'mesio';
  const suffix = cleanSurface === 'buccal' ? 'buccal' : 'lingual';
  
  return `${prefix}_${suffix}` as MeasurementLocation;
};

/**
 * Process database measurements and return structured updates
 */
export const processDbMeasurements = (measurements: DbMeasurement[]) => {
  const updates: Array<{
    toothId: number;
    location: MeasurementLocation;
    type: MeasurementType;
    value: MeasurementSiteValue;
  }> = [];
  
  const updatedTeethIds = new Set<number>();
  
  measurements.forEach(measurement => {
    const { quadrant, tooth_in_quadrant, surface, type, distal, middle, mesial, value } = measurement;
    
    // Get universal tooth number
    const toothId = getUniversalToothNumber(quadrant, tooth_in_quadrant);
    if (toothId === -1) return;
    
    // Map measurement type
    const measurementType = mapDbTypeToMeasurementType(type);
    if (!measurementType) return;
    
    // Track which teeth are being updated
    updatedTeethIds.add(toothId);
    
    // For bleeding/plaque, if there's a boolean value field, use it
    // Otherwise use the numeric values
    const isBoolean = measurementType === MeasurementType.BLEEDING || measurementType === MeasurementType.PLAQUE;
    
    // Process distal, middle, mesial sites
    const sites: Array<{ site: 'distal' | 'middle' | 'mesial'; value: number | null }> = [
      { site: 'distal', value: distal },
      { site: 'middle', value: middle },
      { site: 'mesial', value: mesial },
    ];
    
    sites.forEach(({ site, value: siteValue }) => {
      if (siteValue === null) return;
      
      const location = mapDbSurfaceToLocation(surface, site);
      
      // For bleeding/plaque, convert to boolean (value > 0 means true)
      const finalValue: MeasurementSiteValue = isBoolean ? siteValue > 0 : siteValue;
      
      updates.push({
        toothId,
        location,
        type: measurementType,
        value: finalValue,
      });
    });
  });
  
  return { updates, updatedTeethIds: Array.from(updatedTeethIds) };
};

/**
 * Fetch measurements from the database
 * Can use either Supabase API or local JSON file for testing
 */
export const fetchDbMeasurements = async (source: 'supabase' | 'local' = 'supabase', filename: string = '/test.json'): Promise<DbMeasurement[]> => {
  try {
    if (source === 'supabase') {
      // Import dynamically to avoid circular dependencies
      const { fetchClinicalObservations } = await import('./supabaseConfig');
      const data = await fetchClinicalObservations();
      return data;
    } else {
      // Fallback to local JSON file for testing
      const response = await fetch(filename);
      if (!response.ok) {
        console.warn(`Failed to fetch ${filename}:`, response.statusText);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    console.error('Error fetching database measurements:', error);
    return [];
  }
};

