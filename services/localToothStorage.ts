import { ToothData } from '../types';

export interface LocalToothState {
  teeth: ToothData[];
  lastUpdated: string;
  patientId: string;
}

export interface ToothAnalysisData {
  toothId: number;
  measurements: any;
  analysis: string;
  diagnosis: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  lastAnalyzed: string;
}

class LocalToothStorageService {
  private readonly STORAGE_KEY = 'periodontal_tooth_data';
  private readonly ANALYSIS_KEY = 'tooth_analysis_data';

  /**
   * Save tooth data to localStorage
   */
  saveToothData(teeth: ToothData[], patientId: string = 'default_patient'): void {
    const state: LocalToothState = {
      teeth,
      lastUpdated: new Date().toISOString(),
      patientId
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      console.log('💾 Tooth data saved to localStorage:', { teethCount: teeth.length, patientId });
    } catch (error) {
      console.error('❌ Failed to save tooth data:', error);
    }
  }

  /**
   * Load tooth data from localStorage
   */
  loadToothData(): ToothData[] | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const state: LocalToothState = JSON.parse(stored);
      console.log('📂 Tooth data loaded from localStorage:', { 
        teethCount: state.teeth.length, 
        lastUpdated: state.lastUpdated,
        patientId: state.patientId 
      });
      
      return state.teeth;
    } catch (error) {
      console.error('❌ Failed to load tooth data:', error);
      return null;
    }
  }

  /**
   * Save analysis data for a specific tooth
   */
  saveToothAnalysis(analysisData: ToothAnalysisData): void {
    try {
      const existing = this.loadAllAnalyses();
      const updated = existing.filter(a => a.toothId !== analysisData.toothId);
      updated.push(analysisData);
      
      localStorage.setItem(this.ANALYSIS_KEY, JSON.stringify(updated));
      console.log('🧠 Analysis saved for tooth:', analysisData.toothId);
    } catch (error) {
      console.error('❌ Failed to save analysis:', error);
    }
  }

  /**
   * Load analysis data for a specific tooth
   */
  loadToothAnalysis(toothId: number): ToothAnalysisData | null {
    try {
      const analyses = this.loadAllAnalyses();
      return analyses.find(a => a.toothId === toothId) || null;
    } catch (error) {
      console.error('❌ Failed to load analysis:', error);
      return null;
    }
  }

  /**
   * Load all analysis data
   */
  loadAllAnalyses(): ToothAnalysisData[] {
    try {
      const stored = localStorage.getItem(this.ANALYSIS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to load analyses:', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ANALYSIS_KEY);
    console.log('🗑️ All tooth data cleared');
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { teethCount: number; analysesCount: number; lastUpdated?: string } {
    const teeth = this.loadToothData();
    const analyses = this.loadAllAnalyses();
    
    return {
      teethCount: teeth?.length || 0,
      analysesCount: analyses.length,
      lastUpdated: teeth ? new Date().toISOString() : undefined
    };
  }

  /**
   * Export all data for backup
   */
  exportAllData(): string {
    const teeth = this.loadToothData();
    const analyses = this.loadAllAnalyses();
    
    return JSON.stringify({
      teeth: teeth || [],
      analyses,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import data from backup
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.teeth) {
        this.saveToothData(data.teeth);
      }
      
      if (data.analyses) {
        localStorage.setItem(this.ANALYSIS_KEY, JSON.stringify(data.analyses));
      }
      
      console.log('📥 Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const localToothStorage = new LocalToothStorageService();
