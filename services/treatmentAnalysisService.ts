import { PRIMEINTELLECT_CONFIG, createPrimeIntellectClient } from '../config/supabase';
import { localToothStorage, ToothAnalysisData } from './localToothStorage';
import { externalAIService } from './externalAIService';

export interface TreatmentAnalysisData {
  id: string;
  patient_id: string;
  tooth_id: number;
  analysis_text: string;
  prediction: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
  originalMeasurements?: any; // Store original measurements for comparison
  chartDataHash?: string; // Hash of chart data for overall analysis change detection
}

export interface PredictionData {
  id: string;
  treatment_analysis_id: string;
  prediction_type: 'success_probability' | 'complications' | 'timeline' | 'recommendations';
  prediction_text: string;
  confidence: number;
  created_at: string;
}

class TreatmentAnalysisService {
  private primeIntellect = createPrimeIntellectClient();
  private externalAI = externalAIService;

  /**
   * Generate treatment analysis using PrimeIntellect.ai with local data
   * @param toothId - The tooth ID to analyze
   * @param measurements - Optional measurements data
   * @returns Promise with treatment analysis data
   */
  async generateAnalysis(toothId: number, measurements?: any): Promise<TreatmentAnalysisData> {
    try {
      console.log('🧠 TreatmentAnalysisService - generateAnalysis called:', { toothId, measurements });
      
      // First check if we have cached analysis for this tooth
      const cachedAnalysis = localToothStorage.loadToothAnalysis(toothId);
      console.log('📋 Cached analysis found:', cachedAnalysis);
      
      if (cachedAnalysis) {
        // Check if measurements have changed
        const measurementsChanged = JSON.stringify(measurements) !== JSON.stringify(cachedAnalysis.measurements);
        console.log('🔄 Measurements changed?', measurementsChanged);
        console.log('📊 Current measurements:', measurements);
        console.log('📊 Cached measurements:', cachedAnalysis.measurements);
        
        if (!measurementsChanged) {
          console.log('📋 Using cached analysis for tooth', toothId);
          // Convert cached analysis to TreatmentAnalysisData format
          return {
            id: `cached_${toothId}_${Date.now()}`,
            patient_id: 'demo_patient',
            tooth_id: toothId,
            analysis_text: cachedAnalysis.analysis,
            prediction: cachedAnalysis.diagnosis,
            confidence_score: cachedAnalysis.confidence,
            created_at: cachedAnalysis.lastAnalyzed,
            updated_at: cachedAnalysis.lastAnalyzed,
            originalMeasurements: measurements
          };
        } else {
          console.log('🔄 Measurements changed for tooth', toothId, '- generating new analysis');
        }
      }

      // Use external AI service instead of PrimeIntellect
      const response = await this.externalAI.generateToothAnalysis(toothId, measurements);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from external AI service');
      }

      const analysisResult = JSON.parse(content);
      
      // Transform the response into our expected format
      const analysisData: TreatmentAnalysisData = {
        id: `analysis_${toothId}_${Date.now()}`,
        patient_id: 'demo_patient',
        tooth_id: toothId,
        analysis_text: analysisResult.analysis || 'Analysis not available',
        prediction: analysisResult.prediction || 'Prediction not available',
        confidence_score: analysisResult.confidence || 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store predictions for detailed analysis
      if (analysisResult.predictions && Array.isArray(analysisResult.predictions)) {
        this.storePredictions(analysisData.id, analysisResult.predictions);
      }

      // Save to local tooth storage
      const toothAnalysisData: ToothAnalysisData = {
        toothId,
        measurements: measurements || {},
        analysis: analysisData.analysis_text,
        diagnosis: analysisData.prediction,
        confidence: analysisData.confidence_score,
        riskLevel: this.determineRiskLevel(analysisData.confidence_score, measurements),
        recommendations: this.extractRecommendations(analysisData.prediction),
        lastAnalyzed: new Date().toISOString()
      };
      
      localToothStorage.saveToothAnalysis(toothAnalysisData);

      return analysisData;
    } catch (error) {
      console.error('Error generating treatment analysis:', error);
      throw new Error(`Failed to generate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store prediction data for detailed analysis
   */
  private storePredictions(analysisId: string, predictions: any[]): void {
    // In a real implementation, this would store to a database
    // For now, we'll store in memory or localStorage
    const predictionData: PredictionData[] = predictions.map((pred, index) => ({
      id: `pred_${analysisId}_${index}`,
      treatment_analysis_id: analysisId,
      prediction_type: pred.type,
      prediction_text: pred.text,
      confidence: pred.confidence,
      created_at: new Date().toISOString()
    }));

    // Store in localStorage for persistence
    localStorage.setItem(`predictions_${analysisId}`, JSON.stringify(predictionData));
  }

  /**
   * Get predictions for a specific analysis
   */
  getPredictions(analysisId: string): PredictionData[] {
    try {
      const stored = localStorage.getItem(`predictions_${analysisId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving predictions:', error);
      return [];
    }
  }

  /**
   * Get loading message
   */
  getLoadingMessage(): string {
    return 'Diagnosis is being analyzed...';
  }

  /**
   * Get overall analysis loading message
   */
  getOverallLoadingMessage(): string {
    return 'Overall oral health is being analyzed...';
  }

  /**
   * Generate overall oral health analysis
   * @param chartData - All teeth data for comprehensive analysis
   * @returns Promise with overall analysis data
   */
  async generateOverallAnalysis(chartData: any[]): Promise<TreatmentAnalysisData> {
    try {
      // Check cache for overall analysis
      const cacheKey = 'overall_analysis_cache';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        
        // Check if chart data has changed by comparing with cached data
        const chartDataHash = this.generateChartDataHash(chartData);
        const cachedHash = cachedData.chartDataHash;
        
        if (chartDataHash === cachedHash) {
          console.log('📋 Using cached overall analysis');
          return cachedData;
        } else {
          console.log('🔄 Chart data changed - generating new overall analysis');
        }
      }
      // Use external AI service instead of PrimeIntellect
      const response = await this.externalAI.generateOverallAnalysis(chartData);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from external AI service');
      }

      const analysisResult = JSON.parse(content);
      
      // Transform the response into our expected format
      const analysisData: TreatmentAnalysisData = {
        id: `overall_analysis_${Date.now()}`,
        patient_id: 'demo_patient',
        tooth_id: 0, // 0 indicates overall analysis
        analysis_text: analysisResult.analysis || 'Overall analysis not available',
        prediction: analysisResult.prediction || 'Overall prediction not available',
        confidence_score: analysisResult.confidence || 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store predictions for detailed analysis
      if (analysisResult.predictions && Array.isArray(analysisResult.predictions)) {
        this.storePredictions(analysisData.id, analysisResult.predictions);
      }

      // Add chart data hash for change detection
      analysisData.chartDataHash = this.generateChartDataHash(chartData);
      
      // Cache the overall analysis
      localStorage.setItem(cacheKey, JSON.stringify(analysisData));

      return analysisData;
    } catch (error) {
      console.error('Error generating overall analysis:', error);
      throw new Error(`Failed to generate overall analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear cached data for a tooth or overall analysis
   */
  clearCache(toothId: number | null): void {
    // Clear any cached data for this tooth or overall analysis
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (toothId === null) {
        // Clear overall analysis cache
        if (key.includes('overall_analysis') || key.includes('analysis_0')) {
          localStorage.removeItem(key);
        }
      } else {
        // Clear specific tooth cache
        if (key.includes(`tooth_${toothId}`) || key.includes(`analysis_${toothId}`)) {
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Determine risk level based on confidence and measurements
   */
  private determineRiskLevel(confidence: number, measurements: any): 'low' | 'medium' | 'high' | 'critical' {
    // Analyze measurements to determine risk
    let riskScore = 0;
    
    if (measurements) {
      // Check pocket depths
      const pd = measurements['Pocket Depth'] || {};
      Object.values(pd).forEach((depth: any) => {
        if (typeof depth === 'number') {
          if (depth > 6) riskScore += 3;
          else if (depth > 4) riskScore += 2;
          else if (depth > 3) riskScore += 1;
        }
      });

      // Check bleeding
      const bop = measurements['Bleeding on Probing'] || {};
      Object.values(bop).forEach((bleeding: any) => {
        if (bleeding) riskScore += 1;
      });

      // Check mobility
      if (measurements.mobility > 2) riskScore += 3;
      else if (measurements.mobility > 1) riskScore += 2;
      else if (measurements.mobility > 0) riskScore += 1;
    }

    // Combine with confidence (lower confidence = higher risk)
    const adjustedRisk = riskScore + (1 - confidence) * 2;

    if (adjustedRisk >= 6) return 'critical';
    if (adjustedRisk >= 4) return 'high';
    if (adjustedRisk >= 2) return 'medium';
    return 'low';
  }

  /**
   * Extract recommendations from diagnosis text
   */
  private extractRecommendations(diagnosis: string): string[] {
    const recommendations: string[] = [];
    
    if (diagnosis.toLowerCase().includes('scaling')) {
      recommendations.push('Professional scaling and root planing');
    }
    if (diagnosis.toLowerCase().includes('surgery')) {
      recommendations.push('Surgical intervention may be required');
    }
    if (diagnosis.toLowerCase().includes('maintenance')) {
      recommendations.push('Regular maintenance visits every 3 months');
    }
    if (diagnosis.toLowerCase().includes('hygiene')) {
      recommendations.push('Improved oral hygiene routine');
    }
    if (diagnosis.toLowerCase().includes('antibiotic')) {
      recommendations.push('Antibiotic therapy');
    }
    
    return recommendations.length > 0 ? recommendations : ['Continue current treatment plan'];
  }

  /**
   * Generate hash for chart data to detect changes
   */
  private generateChartDataHash(chartData: any[]): string {
    // Create a simplified representation of chart data for hashing
    const simplifiedData = chartData.map(tooth => ({
      id: tooth.id,
      measurements: tooth.measurements,
      mobility: tooth.mobility,
      furcation: tooth.furcation,
      isMissing: tooth.isMissing
    }));
    
    // Generate hash from JSON string
    const dataString = JSON.stringify(simplifiedData);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

// Export singleton instance
export const treatmentAnalysisService = new TreatmentAnalysisService();