import { MeasurementType } from '../types';

// PrimeIntellect.ai configuration
export const PRIMEINTELLECT_CONFIG = {
  // Replace with your actual PrimeIntellect.ai API details
  apiKey: 'your-primeintellect-api-key-here',
  baseUrl: 'https://api.primeintellect.ai/v1',
  
  // Model configuration
  model: 'gpt-4o-mini', // or your preferred model
  maxTokens: 2000,
  temperature: 0.7,
  
  // Endpoints
  endpoints: {
    chat: '/chat/completions',
    models: '/models'
  }
};

// Helper function to generate intelligent analysis based on actual measurements
const generateIntelligentAnalysis = (toothId: string, measurements: any, hasProblems: boolean) => {
  console.log('🧠 Generating intelligent analysis for tooth', toothId, 'with problems:', hasProblems);
  
  // Extract specific measurements
  const pd = measurements['Pocket Depth'] || {};
  const rec = measurements['Recession'] || {};
  const bop = measurements['Bleeding on Probing'] || {};
  const plaque = measurements['Plaque'] || {};
  const mobility = measurements.mobility || 0;
  const furcation = measurements.furcation || {};
  
  // Calculate statistics
  const pdValues = Object.values(pd).filter(v => typeof v === 'number') as number[];
  const recValues = Object.values(rec).filter(v => typeof v === 'number') as number[];
  const bopCount = Object.values(bop).filter(v => v === true).length;
  const plaqueCount = Object.values(plaque).filter(v => v === true).length;
  
  const maxPD = Math.max(...pdValues, 0);
  const maxREC = Math.max(...recValues, 0);
  const bopPercentage = (bopCount / 6) * 100;
  const plaquePercentage = (plaqueCount / 6) * 100;
  
  console.log('📊 Calculated stats:', { maxPD, maxREC, bopPercentage, plaquePercentage, mobility });
  
  if (hasProblems) {
    // Generate problem-specific analysis
    let severity = 'mild';
    let confidence = 0.75;
    let riskLevel = 'medium';
    
    if (maxPD >= 7 || mobility >= 2) {
      severity = 'severe';
      confidence = 0.90;
      riskLevel = 'high';
    } else if (maxPD >= 5 || mobility >= 1) {
      severity = 'moderate';
      confidence = 0.85;
      riskLevel = 'medium';
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
  } else {
    // Generate healthy tooth analysis
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
};

// Helper function to analyze tooth health
const analyzeToothHealth = (measurements: any) => {
  if (!measurements || Object.keys(measurements).length === 0) {
    // No measurements provided - assume healthy
    return false;
  }

  console.log('🔍 Analyzing tooth health with measurements:', measurements);

  // Check for problematic measurements
  const locations = ['disto_buccal', 'mid_buccal', 'mesio_buccal', 'disto_lingual', 'mid_lingual', 'mesio_lingual'];
  
  let hasProblems = false;
  let problemCount = 0;
  
  for (const location of locations) {
    const pocketDepth = measurements['Pocket Depth']?.[location];
    const recession = measurements['Recession']?.[location];
    const bleeding = measurements['Bleeding on Probing']?.[location];
    
    // Check for problems with more nuanced criteria
    if (pocketDepth && pocketDepth > 3) {
      hasProblems = true;
      problemCount++;
      console.log(`🚨 Problem found: Deep pocket ${pocketDepth}mm at ${location}`);
    }
    if (recession && recession > 1) {
      hasProblems = true;
      problemCount++;
      console.log(`🚨 Problem found: Recession ${recession}mm at ${location}`);
    }
    if (bleeding) {
      hasProblems = true;
      problemCount++;
      console.log(`🚨 Problem found: Bleeding at ${location}`);
    }
  }
  
  // Check mobility and furcation
  if (measurements.mobility && measurements.mobility > 0) {
    hasProblems = true;
    problemCount++;
    console.log(`🚨 Problem found: Mobility grade ${measurements.mobility}`);
  }
  if (measurements.furcation?.buccal > 0 || measurements.furcation?.lingual > 0) {
    hasProblems = true;
    problemCount++;
    console.log(`🚨 Problem found: Furcation involvement`);
  }
  
  console.log(`📊 Tooth health analysis: ${hasProblems ? 'PROBLEMS DETECTED' : 'HEALTHY'} (${problemCount} issues)`);
  return hasProblems;
};

// PrimeIntellect.ai client setup
export const createPrimeIntellectClient = () => {
  return {
    chat: {
      completions: {
        create: async (messages: any[], options: any = {}) => {
          // TODO: Replace with actual PrimeIntellect.ai API call
          // Example implementation:
          /*
          const response = await fetch(`${PRIMEINTELLECT_CONFIG.baseUrl}${PRIMEINTELLECT_CONFIG.endpoints.chat}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${PRIMEINTELLECT_CONFIG.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: options.model || PRIMEINTELLECT_CONFIG.model,
              messages: messages,
              max_tokens: options.max_tokens || PRIMEINTELLECT_CONFIG.maxTokens,
              temperature: options.temperature || PRIMEINTELLECT_CONFIG.temperature,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`PrimeIntellect.ai API error: ${response.status}`);
          }
          
          return await response.json();
          */
          
          // Mock implementation for now
          console.log('PrimeIntellect.ai API call (MOCK):', { messages, options });
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Simulate realistic analysis based on tooth data
          const toothId = messages[1]?.content?.match(/tooth (\d+)/)?.[1] || 'unknown';
          
          // Extract measurements from the content
          let measurements = {};
          try {
            const measurementsMatch = messages[1]?.content?.match(/Current measurements: (.+)/);
            if (measurementsMatch) {
              measurements = JSON.parse(measurementsMatch[1]);
            }
          } catch (e) {
            console.warn('Failed to parse measurements:', e);
          }
          
          // Analyze actual measurements to determine health status
          const hasProblems = analyzeToothHealth(measurements);
          
          console.log('Analyzing tooth', toothId, 'with measurements:', measurements);
          
          // Generate intelligent analysis based on actual measurements
          const analysisResult = generateIntelligentAnalysis(toothId, measurements, hasProblems);
          
          return Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify(analysisResult)
              }
            }]
          });
        }
      }
    }
  };
};