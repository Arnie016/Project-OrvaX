/**
 * Data Formatter for AI Analysis
 * Converts raw tooth measurements into structured, detailed data for better AI accuracy
 */

import { ToothData, MeasurementType, MeasurementLocation } from '../types';

export interface FormattedToothData {
  toothId: number;
  toothName: string;
  measurements: {
    pocketDepths: {
      buccal: number[];
      lingual: number[];
      max: number;
      average: number;
    };
    recession: {
      buccal: number[];
      lingual: number[];
      max: number;
      average: number;
    };
    clinicalAttachmentLoss: {
      buccal: number[];
      lingual: number[];
      max: number;
      average: number;
    };
    bleeding: {
      buccal: boolean[];
      lingual: boolean[];
      totalSites: number;
      bleedingSites: number;
      percentage: number;
    };
    plaque: {
      buccal: boolean[];
      lingual: boolean[];
      totalSites: number;
      plaqueSites: number;
      percentage: number;
    };
  };
  additionalFactors: {
    mobility: number;
    furcation: {
      buccal: number;
      lingual: number;
      hasFurcation: boolean;
    };
    riskScore: number;
    isMissing: boolean;
  };
  clinicalSummary: {
    severity: 'healthy' | 'mild' | 'moderate' | 'severe' | 'critical';
    primaryConcerns: string[];
    treatmentPriority: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export class DataFormatter {
  /**
   * Format tooth data for AI analysis with enhanced detail
   */
  static formatToothDataForAI(toothData: ToothData): FormattedToothData {
    const { id, measurements, mobility, furcation, cal, riskScore, isMissing } = toothData;
    
    // Get tooth name
    const toothName = this.getToothName(id);
    
    // Extract and structure measurements
    const pocketDepths = this.extractPocketDepths(measurements);
    const recession = this.extractRecession(measurements);
    const clinicalAttachmentLoss = this.extractCAL(cal);
    const bleeding = this.extractBleeding(measurements);
    const plaque = this.extractPlaque(measurements);
    
    // Calculate clinical summary
    const clinicalSummary = this.calculateClinicalSummary(
      pocketDepths, recession, bleeding, plaque, mobility, furcation, riskScore
    );
    
    return {
      toothId: id,
      toothName,
      measurements: {
        pocketDepths,
        recession,
        clinicalAttachmentLoss,
        bleeding,
        plaque
      },
      additionalFactors: {
        mobility: mobility || 0,
        furcation: {
          buccal: furcation?.buccal || 0,
          lingual: furcation?.lingual || 0,
          hasFurcation: !!(furcation?.buccal || furcation?.lingual)
        },
        riskScore: riskScore || 0,
        isMissing: isMissing || false
      },
      clinicalSummary
    };
  }
  
  /**
   * Generate detailed prompt for AI analysis
   */
  static generateDetailedPrompt(formattedData: FormattedToothData): string {
    const { toothId, toothName, measurements, additionalFactors, clinicalSummary } = formattedData;
    
    return `DENTAL ANALYSIS REQUEST - TOOTH ${toothId} (${toothName})

CLINICAL MEASUREMENTS:
Pocket Depths (mm):
- Buccal: ${measurements.pocketDepths.buccal.join(', ')} (Max: ${measurements.pocketDepths.max}mm, Avg: ${measurements.pocketDepths.average.toFixed(1)}mm)
- Lingual: ${measurements.pocketDepths.lingual.join(', ')} (Max: ${measurements.pocketDepths.max}mm, Avg: ${measurements.pocketDepths.average.toFixed(1)}mm)

Recession (mm):
- Buccal: ${measurements.recession.buccal.join(', ')} (Max: ${measurements.recession.max}mm, Avg: ${measurements.recession.average.toFixed(1)}mm)
- Lingual: ${measurements.recession.lingual.join(', ')} (Max: ${measurements.recession.max}mm, Avg: ${measurements.recession.average.toFixed(1)}mm)

Clinical Attachment Loss (mm):
- Buccal: ${measurements.clinicalAttachmentLoss.buccal.join(', ')} (Max: ${measurements.clinicalAttachmentLoss.max}mm, Avg: ${measurements.clinicalAttachmentLoss.average.toFixed(1)}mm)
- Lingual: ${measurements.clinicalAttachmentLoss.lingual.join(', ')} (Max: ${measurements.clinicalAttachmentLoss.max}mm, Avg: ${measurements.clinicalAttachmentLoss.average.toFixed(1)}mm)

Bleeding on Probing:
- Buccal: ${measurements.bleeding.buccal.map(b => b ? 'Yes' : 'No').join(', ')}
- Lingual: ${measurements.bleeding.lingual.map(b => b ? 'Yes' : 'No').join(', ')}
- Total: ${measurements.bleeding.bleedingSites}/${measurements.bleeding.totalSites} sites (${measurements.bleeding.percentage.toFixed(1)}%)

Plaque Accumulation:
- Buccal: ${measurements.plaque.buccal.map(p => p ? 'Yes' : 'No').join(', ')}
- Lingual: ${measurements.plaque.lingual.map(p => p ? 'Yes' : 'No').join(', ')}
- Total: ${measurements.plaque.plaqueSites}/${measurements.plaque.totalSites} sites (${measurements.plaque.percentage.toFixed(1)}%)

ADDITIONAL FACTORS:
- Mobility: Grade ${additionalFactors.mobility}
- Furcation Involvement: Buccal Grade ${additionalFactors.furcation.buccal}, Lingual Grade ${additionalFactors.furcation.lingual}
- Risk Score: ${additionalFactors.riskScore.toFixed(1)}
- Missing Tooth: ${additionalFactors.isMissing ? 'Yes' : 'No'}

CLINICAL ASSESSMENT:
- Severity: ${clinicalSummary.severity.toUpperCase()}
- Primary Concerns: ${clinicalSummary.primaryConcerns.join(', ')}
- Treatment Priority: ${clinicalSummary.treatmentPriority.toUpperCase()}

Please provide a comprehensive periodontal analysis including:
1. Detailed condition assessment
2. Specific treatment recommendations
3. Success probability with confidence level
4. Potential complications and risk factors
5. Treatment timeline and follow-up schedule
6. Preventive measures and maintenance plan`;
  }
  
  /**
   * Extract pocket depth measurements
   */
  private static extractPocketDepths(measurements: any) {
    const pd = measurements[MeasurementType.POCKET_DEPTH] || {};
    const locations: MeasurementLocation[] = ['disto_buccal', 'mid_buccal', 'mesio_buccal', 'disto_lingual', 'mid_lingual', 'mesio_lingual'];
    
    const buccal = [pd.disto_buccal || 0, pd.mid_buccal || 0, pd.mesio_buccal || 0];
    const lingual = [pd.disto_lingual || 0, pd.mid_lingual || 0, pd.mesio_lingual || 0];
    const allValues = [...buccal, ...lingual];
    
    return {
      buccal,
      lingual,
      max: Math.max(...allValues),
      average: allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    };
  }
  
  /**
   * Extract recession measurements
   */
  private static extractRecession(measurements: any) {
    const rec = measurements[MeasurementType.RECESSION] || {};
    
    const buccal = [rec.disto_buccal || 0, rec.mid_buccal || 0, rec.mesio_buccal || 0];
    const lingual = [rec.disto_lingual || 0, rec.mid_lingual || 0, rec.mesio_lingual || 0];
    const allValues = [...buccal, ...lingual];
    
    return {
      buccal,
      lingual,
      max: Math.max(...allValues),
      average: allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    };
  }
  
  /**
   * Extract Clinical Attachment Loss
   */
  private static extractCAL(cal: any) {
    if (!cal) {
      return {
        buccal: [0, 0, 0],
        lingual: [0, 0, 0],
        max: 0,
        average: 0
      };
    }
    
    const buccal = [cal.disto_buccal || 0, cal.mid_buccal || 0, cal.mesio_buccal || 0];
    const lingual = [cal.disto_lingual || 0, cal.mid_lingual || 0, cal.mesio_lingual || 0];
    const allValues = [...buccal, ...lingual];
    
    return {
      buccal,
      lingual,
      max: Math.max(...allValues),
      average: allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    };
  }
  
  /**
   * Extract bleeding data
   */
  private static extractBleeding(measurements: any) {
    const bop = measurements[MeasurementType.BLEEDING] || {};
    
    const buccal = [!!bop.disto_buccal, !!bop.mid_buccal, !!bop.mesio_buccal];
    const lingual = [!!bop.disto_lingual, !!bop.mid_lingual, !!bop.mesio_lingual];
    const allValues = [...buccal, ...lingual];
    
    const bleedingSites = allValues.filter(Boolean).length;
    const totalSites = allValues.length;
    
    return {
      buccal,
      lingual,
      totalSites,
      bleedingSites,
      percentage: (bleedingSites / totalSites) * 100
    };
  }
  
  /**
   * Extract plaque data
   */
  private static extractPlaque(measurements: any) {
    const plaque = measurements[MeasurementType.PLAQUE] || {};
    
    const buccal = [!!plaque.disto_buccal, !!plaque.mid_buccal, !!plaque.mesio_buccal];
    const lingual = [!!plaque.disto_lingual, !!plaque.mid_lingual, !!plaque.mesio_lingual];
    const allValues = [...buccal, ...lingual];
    
    const plaqueSites = allValues.filter(Boolean).length;
    const totalSites = allValues.length;
    
    return {
      buccal,
      lingual,
      totalSites,
      plaqueSites,
      percentage: (plaqueSites / totalSites) * 100
    };
  }
  
  /**
   * Calculate clinical summary
   */
  private static calculateClinicalSummary(
    pocketDepths: any, recession: any, bleeding: any, plaque: any, 
    mobility: number, furcation: any, riskScore: number
  ) {
    const concerns: string[] = [];
    let severity: 'healthy' | 'mild' | 'moderate' | 'severe' | 'critical' = 'healthy';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
    
    // Analyze pocket depths
    if (pocketDepths.max >= 7) {
      severity = 'critical';
      priority = 'urgent';
      concerns.push('Deep periodontal pockets (≥7mm)');
    } else if (pocketDepths.max >= 5) {
      severity = 'severe';
      priority = 'high';
      concerns.push('Moderate to deep pockets (5-6mm)');
    } else if (pocketDepths.max >= 4) {
      severity = 'moderate';
      priority = 'medium';
      concerns.push('Early periodontal pockets (4mm)');
    }
    
    // Analyze recession
    if (recession.max >= 3) {
      concerns.push('Significant recession (≥3mm)');
      if (severity === 'healthy') severity = 'mild';
    }
    
    // Analyze bleeding
    if (bleeding.percentage >= 50) {
      concerns.push('Extensive bleeding on probing (≥50%)');
      if (severity === 'healthy') severity = 'mild';
    } else if (bleeding.percentage >= 25) {
      concerns.push('Moderate bleeding on probing (25-49%)');
      if (severity === 'healthy') severity = 'mild';
    } else if (bleeding.percentage > 0) {
      concerns.push('Minimal bleeding on probing');
      if (severity === 'healthy') severity = 'mild';
    }
    
    // Analyze plaque
    if (plaque.percentage >= 50) {
      concerns.push('Heavy plaque accumulation (≥50%)');
    } else if (plaque.percentage >= 25) {
      concerns.push('Moderate plaque accumulation (25-49%)');
    }
    
    // Analyze mobility
    if (mobility >= 3) {
      severity = 'critical';
      priority = 'urgent';
      concerns.push('Severe tooth mobility (Grade 3)');
    } else if (mobility >= 2) {
      severity = 'severe';
      priority = 'high';
      concerns.push('Moderate tooth mobility (Grade 2)');
    } else if (mobility >= 1) {
      concerns.push('Slight tooth mobility (Grade 1)');
      if (severity === 'healthy') severity = 'mild';
    }
    
    // Analyze furcation
    if (furcation?.buccal >= 2 || furcation?.lingual >= 2) {
      severity = 'severe';
      priority = 'high';
      concerns.push('Advanced furcation involvement (Grade 2+)');
    } else if (furcation?.buccal >= 1 || furcation?.lingual >= 1) {
      concerns.push('Early furcation involvement (Grade 1)');
      if (severity === 'healthy') severity = 'mild';
    }
    
    // Analyze risk score
    if (riskScore >= 50) {
      severity = 'critical';
      priority = 'urgent';
      concerns.push('Very high risk score (≥50)');
    } else if (riskScore >= 30) {
      severity = 'severe';
      priority = 'high';
      concerns.push('High risk score (30-49)');
    } else if (riskScore >= 15) {
      severity = 'moderate';
      priority = 'medium';
      concerns.push('Moderate risk score (15-29)');
    } else if (riskScore >= 5) {
      severity = 'mild';
      priority = 'low';
      concerns.push('Low risk score (5-14)');
    }
    
    if (concerns.length === 0) {
      concerns.push('No significant periodontal concerns detected');
    }
    
    return {
      severity,
      primaryConcerns: concerns,
      treatmentPriority: priority
    };
  }
  
  /**
   * Get tooth name from ID
   */
  private static getToothName(toothId: number): string {
    const toothNames: { [key: number]: string } = {
      11: 'Maxillary Right Central Incisor',
      12: 'Maxillary Right Lateral Incisor',
      13: 'Maxillary Right Canine',
      14: 'Maxillary Right First Premolar',
      15: 'Maxillary Right Second Premolar',
      16: 'Maxillary Right First Molar',
      17: 'Maxillary Right Second Molar',
      21: 'Maxillary Left Central Incisor',
      22: 'Maxillary Left Lateral Incisor',
      23: 'Maxillary Left Canine',
      24: 'Maxillary Left First Premolar',
      25: 'Maxillary Left Second Premolar',
      26: 'Maxillary Left First Molar',
      27: 'Maxillary Left Second Molar',
      31: 'Mandibular Left Central Incisor',
      32: 'Mandibular Left Lateral Incisor',
      33: 'Mandibular Left Canine',
      34: 'Mandibular Left First Premolar',
      35: 'Mandibular Left Second Premolar',
      36: 'Mandibular Left First Molar',
      37: 'Mandibular Left Second Molar',
      41: 'Mandibular Right Central Incisor',
      42: 'Mandibular Right Lateral Incisor',
      43: 'Mandibular Right Canine',
      44: 'Mandibular Right First Premolar',
      45: 'Mandibular Right Second Premolar',
      46: 'Mandibular Right First Molar',
      47: 'Mandibular Right Second Molar'
    };
    
    return toothNames[toothId] || `Tooth ${toothId}`;
  }
}
