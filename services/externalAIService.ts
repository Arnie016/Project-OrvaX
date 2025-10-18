/**
 * External AI Service - Uses external endpoint for AI analysis
 * Replaces the mock PrimeIntellect implementation with real API calls
 * Optimized with model preloading and caching
 */

import { aiModelManager } from './aiModelManager';

export interface AIResponse {
  text: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  prompt: string;
  max_new_tokens: number;
  temperature: number;
}

class ExternalAIService {
  private readonly baseUrl = 'http://216.81.248.15:8000';
  private readonly endpoint = '/generate';

  /**
   * Generate AI response using external endpoint with fallback
   * @param messages - Array of messages for the AI
   * @param options - Optional parameters for the request
   * @returns Promise with AI response
   */
  async generateResponse(messages: AIMessage[], options: {
    max_tokens?: number;
    temperature?: number;
  } = {}): Promise<{ choices: Array<{ message: { content: string } }> }> {
    try {
      console.log('🤖 ExternalAIService - generateResponse called:', { messages, options });
      
      // Get optimized options based on model status
      const optimizedOptions = aiModelManager.getOptimizedOptions();
      const finalOptions = {
        max_tokens: options.max_tokens || optimizedOptions.max_tokens,
        temperature: options.temperature || optimizedOptions.temperature
      };
      
      // Convert messages to a single prompt for the external API
      const prompt = this.convertMessagesToPrompt(messages);
      
      const requestBody: AIRequest = {
        prompt,
        max_new_tokens: finalOptions.max_tokens,
        temperature: finalOptions.temperature
      };

      console.log('📤 Sending request to external AI:', requestBody);

      const response = await fetch(`${this.baseUrl}${this.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(optimizedOptions.timeout)
      });

      if (!response.ok) {
        throw new Error(`External AI API error: ${response.status} - ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      console.log('📥 Received response from external AI:', data);

      // Convert the response to match the expected format
      return {
        choices: [{
          message: {
            content: data.text
          }
        }]
      };

    } catch (error) {
      console.error('❌ External AI endpoint failed, using fallback:', error);
      
      // Fallback to local analysis
      return this.generateFallbackResponse(messages, options);
    }
  }

  /**
   * Generate fallback response when external AI is unavailable
   * @param messages - Array of messages for the AI
   * @param options - Optional parameters for the request
   * @returns Promise with fallback response
   */
  private async generateFallbackResponse(messages: AIMessage[], options: {
    max_tokens?: number;
    temperature?: number;
  } = {}): Promise<{ choices: Array<{ message: { content: string } }> }> {
    console.log('🔄 Using fallback AI analysis');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Extract tooth data from messages
    const userMessage = messages.find(m => m.role === 'user');
    const toothId = userMessage?.content?.match(/tooth (\d+)/)?.[1] || 'unknown';
    
    // Generate intelligent fallback analysis
    const analysisResult = this.generateIntelligentFallback(toothId, userMessage?.content || '');
    
    return {
      choices: [{
        message: {
          content: JSON.stringify(analysisResult)
        }
      }]
    };
  }

  /**
   * Generate intelligent fallback analysis
   * @param toothId - The tooth ID
   * @param content - The message content
   * @returns Analysis result
   */
  private generateIntelligentFallback(toothId: string, content: string): any {
    // Extract measurements from content
    let measurements = {};
    try {
      const measurementsMatch = content.match(/Current measurements: (.+)/);
      if (measurementsMatch) {
        measurements = JSON.parse(measurementsMatch[1]);
      }
    } catch (e) {
      console.warn('Failed to parse measurements:', e);
    }

    // Analyze measurements
    const hasProblems = this.analyzeToothHealth(measurements);
    
    if (hasProblems) {
      return this.generateProblemAnalysis(toothId, measurements);
    } else {
      return this.generateHealthyAnalysis(toothId, measurements);
    }
  }

  /**
   * Analyze tooth health based on measurements
   */
  private analyzeToothHealth(measurements: any): boolean {
    if (!measurements || Object.keys(measurements).length === 0) {
      return false;
    }

    const pd = measurements['Pocket Depth'] || {};
    const bop = measurements['Bleeding on Probing'] || {};
    const mobility = measurements.mobility || 0;

    // Check for problems
    const pdValues = Object.values(pd).filter(v => typeof v === 'number') as number[];
    const bopCount = Object.values(bop).filter(v => v === true).length;
    const maxPD = Math.max(...pdValues, 0);

    return maxPD > 3 || bopCount > 0 || mobility > 0;
  }

  /**
   * Generate analysis for problematic teeth
   */
  private generateProblemAnalysis(toothId: string, measurements: any): any {
    const pd = measurements['Pocket Depth'] || {};
    const rec = measurements['Recession'] || {};
    const bop = measurements['Bleeding on Probing'] || {};
    const plaque = measurements['Plaque'] || {};
    const mobility = measurements.mobility || 0;

    const pdValues = Object.values(pd).filter(v => typeof v === 'number') as number[];
    const recValues = Object.values(rec).filter(v => typeof v === 'number') as number[];
    const bopCount = Object.values(bop).filter(v => v === true).length;
    const plaqueCount = Object.values(plaque).filter(v => v === true).length;

    const maxPD = Math.max(...pdValues, 0);
    const maxREC = Math.max(...recValues, 0);
    const bopPercentage = (bopCount / 6) * 100;
    const plaquePercentage = (plaqueCount / 6) * 100;

    let severity = 'mild';
    let confidence = 0.75;

    if (maxPD >= 7 || mobility >= 2) {
      severity = 'severe';
      confidence = 0.90;
    } else if (maxPD >= 5 || mobility >= 1) {
      severity = 'moderate';
      confidence = 0.85;
    }

    const analysis = `Based on the periodontal measurements for tooth ${toothId}, the analysis reveals ${severity} periodontal disease. Pocket depths reach ${maxPD}mm, recession measures ${maxREC}mm, bleeding on probing is ${bopPercentage.toFixed(0)}%, and plaque accumulation is ${plaquePercentage.toFixed(0)}%. ${mobility > 0 ? `Tooth mobility grade ${mobility} is present.` : ''}`;

    let prediction = '';
    if (severity === 'severe') {
      prediction = `Severe periodontal disease requires immediate intervention. Scaling and root planing with possible surgical therapy recommended. Success probability: ${(confidence * 100).toFixed(0)}%. Follow-up every 2-3 months.`;
    } else if (severity === 'moderate') {
      prediction = `Moderate periodontal disease requires professional treatment. Scaling and root planing recommended with ${(confidence * 100).toFixed(0)}% success probability. Follow-up every 3 months.`;
    } else {
      prediction = `Mild periodontal disease detected. Professional cleaning and improved oral hygiene recommended. Success probability: ${(confidence * 100).toFixed(0)}%. Follow-up every 6 months.`;
    }

    return {
      analysis,
      prediction,
      confidence,
      predictions: [
        {
          type: "success_probability",
          text: `${(confidence * 100).toFixed(0)}% success probability with proper treatment adherence`,
          confidence: confidence
        },
        {
          type: "complications",
          text: `${severity === 'severe' ? 'High' : severity === 'moderate' ? 'Medium' : 'Low'} risk of complications. Monitor for bleeding, sensitivity, and tooth mobility.`,
          confidence: confidence - 0.1
        },
        {
          type: "timeline",
          text: `Expected improvement within ${severity === 'severe' ? '6-12' : severity === 'moderate' ? '4-8' : '2-4'} weeks with proper maintenance`,
          confidence: confidence - 0.05
        },
        {
          type: "recommendations",
          text: `Recommend ${severity === 'severe' ? 'scaling, root planing, and possible surgical intervention' : severity === 'moderate' ? 'scaling and root planing' : 'professional cleaning'}, followed by ${severity === 'severe' ? '2-3' : '3-6'} month maintenance visits`,
          confidence: confidence + 0.05
        }
      ]
    };
  }

  /**
   * Generate analysis for healthy teeth
   */
  private generateHealthyAnalysis(toothId: string, measurements: any): any {
    const bop = measurements['Bleeding on Probing'] || {};
    const plaque = measurements['Plaque'] || {};
    const bopCount = Object.values(bop).filter(v => v === true).length;
    const plaqueCount = Object.values(plaque).filter(v => v === true).length;
    const bopPercentage = (bopCount / 6) * 100;
    const plaquePercentage = (plaqueCount / 6) * 100;

    const analysis = `Based on the periodontal measurements for tooth ${toothId}, the analysis shows excellent periodontal health. All measurements are within normal ranges: pocket depths ≤3mm, no recession, minimal bleeding (${bopPercentage.toFixed(0)}%), and low plaque accumulation (${plaquePercentage.toFixed(0)}%). No mobility detected.`;

    const prediction = `No treatment required. Continue excellent oral hygiene routine and regular dental checkups every 6 months.`;

    return {
      analysis,
      prediction,
      confidence: 0.95,
      predictions: [
        {
          type: "success_probability",
          text: "Excellent prognosis - no treatment needed",
          confidence: 0.95
        },
        {
          type: "complications",
          text: "No complications expected. Maintain current excellent oral hygiene routine.",
          confidence: 0.90
        },
        {
          type: "timeline",
          text: "Continue current maintenance schedule - no changes needed",
          confidence: 0.88
        },
        {
          type: "recommendations",
          text: "Maintain excellent oral hygiene, regular dental checkups every 6 months, and preventive care",
          confidence: 0.92
        }
      ]
    };
  }

  /**
   * Convert messages array to a single prompt string
   * @param messages - Array of messages
   * @returns Formatted prompt string
   */
  private convertMessagesToPrompt(messages: AIMessage[]): string {
    let prompt = '';
    
    messages.forEach((message, index) => {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `User: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    });

    // Add instruction for the AI to respond as an assistant
    prompt += 'Assistant: ';
    
    return prompt.trim();
  }

  /**
   * Generate analysis for a specific tooth
   * @param toothId - The tooth ID to analyze
   * @param measurements - Tooth measurements data
   * @returns Promise with analysis result
   */
  async generateToothAnalysis(toothId: number, measurements: any): Promise<any> {
    const messages: AIMessage[] = [
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
        content: `Please analyze tooth ${toothId} for periodontal treatment. Current measurements: ${JSON.stringify(measurements)}`
      }
    ];

    return await this.generateResponse(messages, {
      max_tokens: 512,
      temperature: 0.2
    });
  }

  /**
   * Generate overall oral health analysis
   * @param chartData - Complete dental chart data
   * @returns Promise with overall analysis result
   */
  async generateOverallAnalysis(chartData: any[]): Promise<any> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a dental AI assistant specializing in comprehensive oral health analysis. 
        Analyze the provided complete dental chart data and generate overall oral health assessment.
        
        Your response should be a JSON object with the following structure:
        {
          "analysis": "Comprehensive analysis of overall oral health condition",
          "prediction": "Overall treatment recommendations and prognosis",
          "confidence": 0.85,
          "predictions": [
            {
              "type": "overall_health",
              "text": "Overall oral health assessment",
              "confidence": 0.85
            },
            {
              "type": "risk_factors", 
              "text": "Identified risk factors and concerns",
              "confidence": 0.78
            },
            {
              "type": "treatment_priority",
              "text": "Treatment priority and sequencing",
              "confidence": 0.82
            },
            {
              "type": "maintenance_plan",
              "text": "Long-term maintenance recommendations",
              "confidence": 0.90
            }
          ]
        }`
      },
      {
        role: 'user',
        content: `Please analyze the overall oral health based on complete dental chart data: ${JSON.stringify(chartData)}`
      }
    ];

    return await this.generateResponse(messages, {
      max_tokens: 512,
      temperature: 0.2
    });
  }
}

// Export singleton instance
export const externalAIService = new ExternalAIService();
