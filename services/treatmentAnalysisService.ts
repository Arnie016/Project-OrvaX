import { PRIMEINTELLECT_CONFIG, createPrimeIntellectClient } from '../config/supabase';

export interface TreatmentAnalysisData {
  id: string;
  patient_id: string;
  tooth_id: number;
  analysis_text: string;
  prediction: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
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

  /**
   * Generate treatment analysis using PrimeIntellect.ai
   * @param toothId - The tooth ID to analyze
   * @param measurements - Optional measurements data
   * @returns Promise with treatment analysis data
   */
  async generateAnalysis(toothId: number, measurements?: any): Promise<TreatmentAnalysisData> {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a dental AI assistant specializing in periodontal treatment analysis. 
          Analyze the provided tooth data and generate comprehensive treatment recommendations.
          
          Your response should be a JSON object with the following structure:
          {
            "analysis": "Detailed analysis of the tooth condition",
            "prediction": "Treatment diagnosis and recommendations",
            "confidence": 0.85,
            "predictions": [
              {
                "type": "success_probability",
                "text": "Success probability analysis",
                "confidence": 0.85
              },
              {
                "type": "complications", 
                "text": "Potential complications analysis",
                "confidence": 0.78
              },
              {
                "type": "timeline",
                "text": "Treatment timeline expectations",
                "confidence": 0.82
              },
              {
                "type": "recommendations",
                "text": "Specific treatment recommendations",
                "confidence": 0.90
              }
            ]
          }`
        },
        {
          role: 'user',
          content: `Please analyze tooth ${toothId} for periodontal treatment. ${measurements ? `Additional measurements: ${JSON.stringify(measurements)}` : 'No additional measurements provided.'}`
        }
      ];

      const response = await this.primeIntellect.chat.completions.create(messages, {
        model: PRIMEINTELLECT_CONFIG.model,
        max_tokens: PRIMEINTELLECT_CONFIG.maxTokens,
        temperature: PRIMEINTELLECT_CONFIG.temperature
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from PrimeIntellect.ai');
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
   * Clear cached data for a tooth
   */
  clearCache(toothId: number): void {
    // Clear any cached data for this tooth
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(`tooth_${toothId}`) || key.includes(`analysis_${toothId}`)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Export singleton instance
export const treatmentAnalysisService = new TreatmentAnalysisService();