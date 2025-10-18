export enum MeasurementType {
  POCKET_DEPTH = 'Pocket Depth',
  RECESSION = 'Recession',
  BLEEDING = 'Bleeding on Probing',
  PLAQUE = 'Plaque',
  MOBILITY = 'Mobility',
  FURCATION = 'Furcation',
}

export type MeasurementLocation = 
  | 'disto_buccal'
  | 'mid_buccal'
  | 'mesio_buccal'
  | 'disto_lingual'
  | 'mid_lingual'
  | 'mesio_lingual';

// Special locations for tooth-level data entry
export type NonSiteLocation = 'mobility' | 'furcation_buccal' | 'furcation_lingual';

export type MeasurementSiteValue = number | boolean;

export interface PerioSiteMeasurements {
  [key: string]: MeasurementSiteValue | undefined;
  disto_buccal?: MeasurementSiteValue;
  mid_buccal?: MeasurementSiteValue;
  mesio_buccal?: MeasurementSiteValue;
  disto_lingual?: MeasurementSiteValue;
  mid_lingual?: MeasurementSiteValue;
  mesio_lingual?: MeasurementSiteValue;
}

export interface ToothData {
  id: number;
  measurements: {
    [MeasurementType.POCKET_DEPTH]?: PerioSiteMeasurements;
    [MeasurementType.RECESSION]?: PerioSiteMeasurements;
    [MeasurementType.BLEEDING]?: PerioSiteMeasurements; // boolean
    [MeasurementType.PLAQUE]?: PerioSiteMeasurements; // boolean
  };
  mobility?: number; // Grade 0, 1, 2, 3
  furcation?: { // Molars only
    buccal?: number; // Grade 1, 2, 3
    lingual?: number; // Grade 1, 2, 3
  };
  isMissing?: boolean;

  // Agentic, calculated properties
  cal?: PerioSiteMeasurements; // Clinical Attachment Loss
  riskScore?: number; // Prognostic score
}
