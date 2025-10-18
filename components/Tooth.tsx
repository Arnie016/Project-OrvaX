
import React, { useState, useEffect, useMemo } from 'react';
import ChatPanel from './ChatPanel.tsx';
import { GoogleGenAI } from "@google/genai";
import { ToothData, MeasurementType, MeasurementLocation, MeasurementSiteValue, NonSiteLocation } from '../types.ts';
import { getUniversalToothId, getPalmerNotation } from '../constants.ts';


// --- Custom Hooks ---
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
};

// --- Helper Functions & Types ---
const getRiskColor = (score: number) => {
  if (score > 40) return 'bg-red-500';
  if (score > 20) return 'bg-orange-500';
  if (score > 5) return 'bg-yellow-500';
  return 'bg-green-500';
};
interface ParsedResult { text: string; isMatched: boolean; }
type CommandAction = { type: 'SELECT_TOOTH', payload: number };
type ContextUpdate = { surface: 'buccal' | 'lingual' };
type Update = { type: MeasurementType, location: MeasurementLocation | NonSiteLocation, value: MeasurementSiteValue };

const normalizeCommand = (text: string): string => {
    let normalized = ` ${text.toLowerCase().trim()} `;
    
    const synonymMap: { [key: string]: string } = {
        'buckle': 'buccal', 'bocal': 'buccal', 'bucc': 'buccal', 'b': 'buccal',
        'lingual': 'lingual', 'ling': 'lingual', 'l': 'lingual',
        'palatal': 'lingual', 'pal': 'lingual',
        'pocket depth': 'pd', 'pocky': 'pd', 'pocket': 'pd', 'period': 'pd', 'depths': 'pd', 'bed': 'pd',
        'recession': 'rec', 'receding': 'rec',
        'mobility': 'mob',
        'bleeding on probing': 'bop', 'bleeding': 'bop',
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'zero': '0',
    };
    
    // Replace synonyms
    Object.keys(synonymMap).forEach(key => {
        normalized = normalized.replace(new RegExp(`\\b${key}\\b`, 'g'), synonymMap[key]);
    });
    
    // Normalize number sequences: "3, 4, 5" or "3-4-5" -> "3 4 5"
    normalized = normalized.replace(/(\d)\s*[,-]\s*(\d)/g, '$1 $2');
    normalized = normalized.replace(/(\d)\s*[,-]\s*(\d)/g, '$1 $2'); // Run twice for "3,4,5"
    
    // Replace hyphens in tooth numbers e.g. "1-1" to "1 1"
    normalized = normalized.replace(/([1-4])-([1-8])/g, '$1 $2');
    
    // Remove filler words
    const fillerWords = ['and', 'for', 'the', 'is', 'a', 'to', 'please', 'set'];
    fillerWords.forEach(word => {
      normalized = normalized.replace(new RegExp(`\\s${word}\\s`, 'g'), ' ');
    });

    return normalized.replace(/\s+/g, ' ').trim();
};


const parseCommand = (
  text: string, 
  activeSurface: 'buccal' | 'lingual' | null
): { updates: Update[], action: CommandAction | null, contextUpdate: ContextUpdate | null } => {
    const updates: Update[] = [];
    let action: CommandAction | null = null;
    let contextUpdate: ContextUpdate | null = null;
    
    const commandString = normalizeCommand(text);
    const parts = commandString.split(' ');
    
    // --- Pass 1: Navigation commands (highest priority) ---
    // e.g., "buccal 1 7", "2 5"
    const navRegex = /(?:(buccal|lingual)\s+)?([1-4])\s+([1-8])\b/;
    const navMatch = commandString.match(navRegex);
    if (navMatch) {
      const quadrant = parseInt(navMatch[2]);
      const toothInQuad = parseInt(navMatch[3]);
      const toothId = getUniversalToothId(quadrant, toothInQuad);
      if (toothId) {
          action = { type: 'SELECT_TOOTH', payload: toothId };
          if (navMatch[1]) {
              contextUpdate = { surface: navMatch[1] as 'buccal' | 'lingual' };
          }
          return { updates, action, contextUpdate };
      }
    }
    
    // --- Pass 2: Contextual rapid data entry (e.g., "3 4 5") ---
    // This is a common case, so we check it early.
    const rapidEntryRegex = /^(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})$/;
    const rapidMatch = commandString.match(rapidEntryRegex);
    if (activeSurface && rapidMatch) {
        updates.push(
            { type: MeasurementType.POCKET_DEPTH, location: `disto_${activeSurface}`, value: parseInt(rapidMatch[1]) },
            { type: MeasurementType.POCKET_DEPTH, location: `mid_${activeSurface}`, value: parseInt(rapidMatch[2]) },
            { type: MeasurementType.POCKET_DEPTH, location: `mesio_${activeSurface}`, value: parseInt(rapidMatch[3]) },
        );
        return { updates, action, contextUpdate };
    }

    // --- Pass 3: Full commands (e.g., "buccal pd 5 4 5") ---
    const fullCommandRegex = /(buccal|lingual)\s+(pd|rec)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/;
    const fullMatch = commandString.match(fullCommandRegex);
    if (fullMatch) {
      const surface = fullMatch[1] as 'buccal' | 'lingual';
      const type = fullMatch[2].startsWith('p') ? MeasurementType.POCKET_DEPTH : MeasurementType.RECESSION;
      updates.push(
        { type, location: `disto_${surface}` as MeasurementLocation, value: parseInt(fullMatch[3]) },
        { type, location: `mid_${surface}` as MeasurementLocation, value: parseInt(fullMatch[4]) },
        { type, location: `mesio_${surface}` as MeasurementLocation, value: parseInt(fullMatch[5]) },
      );
      contextUpdate = { surface };
      return { updates, action, contextUpdate };
    }
    
    // --- Pass 4: Other specific commands ---
    const mobRegex = /mob\s+([0-3])/;
    const mobMatch = commandString.match(mobRegex);
    if (mobMatch) {
        updates.push({ type: MeasurementType.MOBILITY, location: 'mobility', value: parseInt(mobMatch[1]) });
        return { updates, action, contextUpdate };
    }

    // --- Pass 5: Surface context setter ---
    if (parts.length === 1 && (parts[0] === 'buccal' || parts[0] === 'lingual')) {
        contextUpdate = { surface: parts[0] as 'buccal' | 'lingual' };
        return { updates, action, contextUpdate };
    }
    
    return { updates, action, contextUpdate };
};


// --- Sub-components ---
const Stepper: React.FC<{ value: number, onChange: (val: number) => void, severity?: 'pd' }> = ({ value, onChange, severity }) => {
  let severityClass = 'bg-gray-700 border-gray-600';
  if (severity === 'pd') {
    if (value >= 5) severityClass = 'bg-red-700 border-red-500';
    else if (value === 4) severityClass = 'bg-yellow-700 border-yellow-500';
  }
  
  const handleChange = (newValue: number) => {
    console.log('🔢 Stepper - onChange called:', { oldValue: value, newValue });
    onChange(newValue);
  };
  
  return (
  <div className={`flex items-center justify-center rounded-md border transition-colors ${severityClass}`}>
    <button onClick={() => handleChange(Math.max(0, value - 1))} className="px-2 py-1 text-lg hover:bg-gray-600 rounded-l-md">-</button>
    <span className="w-8 text-center font-mono text-lg">{value}</span>
    <button onClick={() => handleChange(value + 1)} className="px-2 py-1 text-lg hover:bg-gray-600 rounded-r-md">+</button>
  </div>
)};

const SegmentedControl: React.FC<{ options: (string|number)[], value: number, onChange: (val: number) => void }> = ({ options, value, onChange }) => (
    <div className="flex bg-gray-900 rounded-md p-0.5 border border-gray-700">
        {options.map(opt => {
            const numOpt = Number(opt);
            return (
            <button key={opt} onClick={() => onChange(numOpt)}
                className={`flex-1 p-1 rounded transition-colors text-sm ${value === numOpt ? 'bg-blue-600 shadow' : 'hover:bg-gray-700'}`}>
                {opt}
            </button>
        )})}
    </div>
);

const CalDisplayBox: React.FC<{ value: MeasurementSiteValue | undefined }> = ({ value }) => {
    let severityClass = 'bg-gray-900 border-gray-700 text-slate-100';
    if (typeof value === 'number') {
        if (value >= 7) severityClass = 'bg-red-500 border-red-400 text-white font-bold';
        else if (value >= 5) severityClass = 'bg-yellow-500 border-yellow-400 text-black font-semibold';
    }

    return (
        <div className={`p-1 rounded-md border text-center ${severityClass}`}>
            {typeof value === 'number' ? value : '-'}
        </div>
    );
};

const SurfaceDataEntry: React.FC<{
  surface: 'buccal' | 'lingual';
  toothData: ToothData;
  onUpdate: (type: MeasurementType, location: MeasurementLocation, value: MeasurementSiteValue) => void;
}> = ({ surface, toothData, onUpdate }) => {
  const { measurements } = toothData;
  const pdData = measurements[MeasurementType.POCKET_DEPTH] || {};
  const recData = measurements[MeasurementType.RECESSION] || {};
  const bopData = measurements[MeasurementType.BLEEDING] || {};
  const plaqueData = measurements[MeasurementType.PLAQUE] || {};

  const toLoc = (
    s: 'buccal' | 'lingual',
    pos: 'disto' | 'mid' | 'mesio'
  ): MeasurementLocation => `${pos}_${s}` as MeasurementLocation;
  const locations: MeasurementLocation[] = [
    toLoc(surface, 'disto'),
    toLoc(surface, 'mid'),
    toLoc(surface, 'mesio')
  ];

  const handleUpdate = (type: MeasurementType, location: MeasurementLocation, value: MeasurementSiteValue) => {
    console.log('🦷 SurfaceDataEntry - handleUpdate called:', { type, location, value });
    onUpdate(type, location, value);
  };
  
  return (
    <div className="bg-gray-900/50 p-3 rounded-lg">
        <div className="grid grid-cols-[auto,1fr,1fr,1fr] gap-x-3 gap-y-2 items-center text-sm">
          {/* Headers */}
          <div />
          <div className="text-xs text-gray-400 text-center">Distal</div>
          <div className="text-xs text-gray-400 text-center">Mid</div>
          <div className="text-xs text-gray-400 text-center">Mesial</div>
          
          {/* Pocket Depth Row */}
          <div className="font-semibold text-blue-300 text-right pr-2">PD</div>
          {locations.map(loc => <Stepper key={`${loc}-pd`} value={(pdData[loc] as number) || 0} onChange={val => handleUpdate(MeasurementType.POCKET_DEPTH, loc, val)} severity="pd" />)}

          {/* Recession Row */}
          <div className="font-semibold text-blue-300 text-right pr-2">REC</div>
          {locations.map(loc => <Stepper key={`${loc}-rec`} value={(recData[loc] as number) || 0} onChange={val => handleUpdate(MeasurementType.RECESSION, loc, val)} />)}
          
          {/* BOP Row */}
          <div className="font-semibold text-blue-300 text-right pr-2">BOP</div>
          {locations.map(loc => <button key={loc} onClick={() => handleUpdate(MeasurementType.BLEEDING, loc, !bopData[loc])} className={`h-8 w-full rounded-md transition-colors ${bopData[loc] ? 'bg-red-500/80' : 'bg-gray-700 hover:bg-gray-600'}`}></button>)}
          
          {/* Plaque Row */}
          <div className="font-semibold text-blue-300 text-right pr-2">Plaque</div>
          {locations.map(loc => <button key={loc} onClick={() => handleUpdate(MeasurementType.PLAQUE, loc, !plaqueData[loc])} className={`h-8 w-full rounded-md transition-colors ${plaqueData[loc] ? 'bg-yellow-400/80' : 'bg-gray-700 hover:bg-gray-600'}`}></button>)}
        </div>
    </div>
  );
};


// --- Main Component ---
interface InfoPanelProps {
  toothData: ToothData;
  onUpdate: (toothId: number, location: MeasurementLocation | NonSiteLocation, type: MeasurementType, value: MeasurementSiteValue) => void;
  onClose: () => void;
  onSelectTooth: (id: number) => void;
  activeSurface: 'buccal' | 'lingual' | null;
  onSetSurface: (surface: 'buccal' | 'lingual' | null) => void;
  overallScores: { bopPercentage: number, plaquePercentage: number };
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ toothData, onUpdate, onClose, onSelectTooth, activeSurface, onSetSurface, overallScores }) => {
  const { id, measurements, mobility, furcation, cal, riskScore, isMissing } = toothData;
  const [command, setCommand] = useState('');
  const debouncedCommand = useDebounce(command, 500);
  const [highlightedResult, setHighlightedResult] = useState<ParsedResult | null>(null);
  const [aiReport, setAiReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const isListening = useMemo(() => !!command, [command]);

  useEffect(() => {
    if (debouncedCommand) {
        const { updates, action, contextUpdate } = parseCommand(debouncedCommand, activeSurface);
        const success = updates.length > 0 || !!action || !!contextUpdate;
        setHighlightedResult({ text: debouncedCommand, isMatched: success });

        if(action?.type === 'SELECT_TOOTH') {
            onSelectTooth(action.payload);
        }
        if(contextUpdate) {
            onSetSurface(contextUpdate.surface);
        }
        updates.forEach(upd => onUpdate(id, upd.location, upd.type, upd.value));

        // Clear command input on successful action
        if (success) {
            setTimeout(() => {
              setCommand('');
              setHighlightedResult(null);
            }, 1000);
        }
    } else {
        setHighlightedResult(null);
    }
  }, [debouncedCommand, id, onUpdate, onSelectTooth, onSetSurface, activeSurface]);
  
  useEffect(() => {
    // Reset AI report when tooth changes
    setAiReport('');
    setIsGeneratingReport(false);
    setIsReportModalOpen(false);
  }, [id]);

  const handleGenerateReport = async () => {
      setIsGeneratingReport(true);
      setIsReportModalOpen(true);
      setAiReport('');
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const formatMeasurements = (type: MeasurementType, surface: 'buccal' | 'lingual') => {
            const m = measurements[type] || {};
            const d = m[`disto_${surface}`];
            const mid = m[`mid_${surface}`];
            const mes = m[`mesio_${surface}`];
            if (d === undefined && mid === undefined && mes === undefined) return 'Not recorded';
            return `Distal=${d ?? 'N/A'}, Mid=${mid ?? 'N/A'}, Mesial=${mes ?? 'N/A'}`;
        }
        const formatBoolean = (type: MeasurementType, surface: 'buccal' | 'lingual') => {
             const m = measurements[type] || {};
             const sites: string[] = [];
             if(m[`disto_${surface}`]) sites.push('Distal');
             if(m[`mid_${surface}`]) sites.push('Mid');
             if(m[`mesio_${surface}`]) sites.push('Mesial');
             return sites.length > 0 ? sites.join(', ') : 'None';
        }

        const prompt = `Please generate a clinical summary for the following tooth data:
Tooth ID: ${id}
Risk Score: ${riskScore?.toFixed(0)}
Mobility: Grade ${mobility ?? 0}
Furcation: Buccal Grade ${furcation?.buccal ?? 0}, Lingual/Palatal Grade ${furcation?.lingual ?? 0}
Measurements:
- Buccal PD: ${formatMeasurements(MeasurementType.POCKET_DEPTH, 'buccal')}
- Buccal Recession: ${formatMeasurements(MeasurementType.RECESSION, 'buccal')}
- Lingual/Palatal PD: ${formatMeasurements(MeasurementType.POCKET_DEPTH, 'lingual')}
- Lingual/Palatal Recession: ${formatMeasurements(MeasurementType.RECESSION, 'lingual')}
- Bleeding on Probing (BOP): Buccal: ${formatBoolean(MeasurementType.BLEEDING, 'buccal')}; Lingual/Palatal: ${formatBoolean(MeasurementType.BLEEDING, 'lingual')}
- Plaque: Buccal: ${formatBoolean(MeasurementType.PLAQUE, 'buccal')}; Lingual/Palatal: ${formatBoolean(MeasurementType.PLAQUE, 'lingual')}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a dental AI assistant specializing in periodontics. Your role is to generate a concise clinical summary for a single tooth based on provided data. The summary should be written in a professional tone, suitable for patient records. Structure the summary clearly. Start with the tooth identification. Detail the 6-point pocket depths (PD) and recession (REC) for both buccal and palatal/lingual surfaces. Calculate and state the Clinical Attachment Loss (CAL) for any site with measurements. Note any bleeding on probing (BOP), plaque, furcation involvement, and mobility. Conclude with a one-sentence assessment based on the overall findings and the provided risk score. Do not add any conversational text or greetings."
            }
        });

        setAiReport(response.text);

      } catch (error) {
        console.error("Error generating AI report:", error);
        setAiReport("Error: Could not generate AI summary. Please check the console for details.");
      } finally {
        setIsGeneratingReport(false);
      }
  };

  const palmerNotation = useMemo(() => getPalmerNotation(id), [id]);
  const toothDisplayName = palmerNotation 
    ? `Q${palmerNotation.quadrant}-${palmerNotation.toothInQuad} (Universal #${id})`
    : `Tooth ${id}`;

  if (isMissing) {
    return ( <aside className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[rgba(25,30,45,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl p-6 text-white w-96 z-30">
        <h2 className="text-2xl font-bold">{toothDisplayName}</h2> <p className="text-lg text-red-400 mt-2">This tooth is marked as missing.</p>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
    </aside> );
  }
  
  const handleUpdate = (type: MeasurementType, location: MeasurementLocation, value: MeasurementSiteValue) => {
    console.log('🦷 InfoPanel - handleUpdate called:', { id, location, type, value });
    onUpdate(id, location, type, value);
  };
  const handleNonSiteUpdate = (type: MeasurementType, location: NonSiteLocation, value: MeasurementSiteValue) => {
    console.log('🦷 InfoPanel - handleNonSiteUpdate called:', { id, location, type, value });
    onUpdate(id, location, type, value);
  };
  const lingualSurfaceTitle = id <= 16 ? 'Palatal' : 'Lingual';

  return (
    <>
      <aside 
        className="absolute top-24 right-4 bg-[rgba(25,30,45,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl p-4 text-white w-[420px] z-30 flex flex-col gap-4 max-h-[calc(100vh-12rem)] overflow-y-auto cursor-move select-none"
        style={{ 
          top: '114px', // Dokładna odległość: header (~100px) + 14px odstępu
          minWidth: '300px',
          minHeight: '200px',
          maxWidth: '80vw',
          maxHeight: '80vh'
        }}
        onMouseDown={(e) => {
          // Sprawdź czy kliknięto w drag handle lub w puste miejsce
          const target = e.target as HTMLElement;
          if (target.closest('.drag-handle') || target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            
            const startX = e.clientX;
            const startY = e.clientY;
            const rect = e.currentTarget.getBoundingClientRect();
            const startLeft = rect.left;
            const startTop = rect.top;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaY = moveEvent.clientY - startY;
              const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, startLeft + deltaX));
              const newTop = Math.max(20, Math.min(window.innerHeight - rect.height, startTop + deltaY));
              
              e.currentTarget.style.left = `${newLeft}px`;
              e.currentTarget.style.top = `${newTop}px`;
              e.currentTarget.style.right = 'auto';
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }
        }}
      >
        <header className="flex justify-between items-start drag-handle cursor-move">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{toothDisplayName}</h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                  <span className="text-sm">Risk:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-gray-900 ${getRiskColor(riskScore || 0)}`}>{riskScore?.toFixed(0) || 0}</span>
              </div>
               <div className="text-sm font-semibold">
                  <span className="text-red-300">BOP: {overallScores.bopPercentage.toFixed(0)}%</span>
                  <span className="text-yellow-300 ml-3">Plaque: {overallScores.plaquePercentage.toFixed(0)}%</span>
               </div>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white leading-none flex-shrink-0">&times;</button>
        </header>

        
        {/* Tabbed Data Entry Section */}
        <section>
          <div className="flex border-b border-gray-700/50">
            {(['buccal', 'lingual'] as const).map(surface => (
              <button
                key={surface}
                onClick={() => onSetSurface(surface)}
                className={`px-6 py-2 -mb-px font-semibold text-sm transition-colors duration-200 border-b-2 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-t-md ${
                  activeSurface === surface
                    ? 'text-blue-300 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'
                }`}
              >
                {surface === 'lingual' ? lingualSurfaceTitle : 'Buccal'}
              </button>
            ))}
          </div>
          <div className="pt-4">
            {activeSurface && <SurfaceDataEntry surface={activeSurface} toothData={toothData} onUpdate={handleUpdate} />}
          </div>
        </section>
        
        <hr className="border-gray-700/50"/>

        {/* Other Measurements */}
        <section className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-300">Clinical Attachment Loss (CAL)</h4>
              <div className="grid grid-cols-6 gap-2 mt-1 text-center font-mono">
                  {(['disto_buccal', 'mid_buccal', 'mesio_buccal', 'mesio_lingual', 'mid_lingual', 'disto_lingual'] as const)
                  .map(loc => <CalDisplayBox key={loc} value={cal?.[loc]} />)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Mobility</h4>
                    <SegmentedControl options={[0,1,2,3]} value={mobility ?? 0} onChange={val => handleNonSiteUpdate(MeasurementType.MOBILITY, 'mobility', val)} />
                </div>
                <div>
                    <h4 className="font-semibold text-blue-300 mb-1">Furcation (B/L)</h4>
                    <div className="flex gap-2">
                        <SegmentedControl options={[0,1,2,3]} value={furcation?.buccal ?? 0} onChange={val => handleNonSiteUpdate(MeasurementType.FURCATION, 'furcation_buccal', val)} />
                        <SegmentedControl options={[0,1,2,3]} value={furcation?.lingual ?? 0} onChange={val => handleNonSiteUpdate(MeasurementType.FURCATION, 'furcation_lingual', val)} />
                    </div>
                </div>
            </div>
        </section>
        
        <div className="flex gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="px-3 py-2 text-xs bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingReport ? '...' : 'AI Summary'}
          </button>
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-3 py-2 text-xs bg-blue-600 rounded-md hover:bg-blue-500 transition-colors"
          >
            Chat
          </button>
        </div>

        {/* Icon on left edge */}
        <div className="absolute bottom-0 left-0 flex items-center justify-center w-8 h-8">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        </div>
        
        {/* Resize Handle */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const target = e.currentTarget as HTMLElement;
            const startWidth = target.parentElement!.offsetWidth;
            const startHeight = target.parentElement!.offsetHeight;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaX = e.clientX - startX;
              const deltaY = e.clientY - startY;
              const target = e.currentTarget as HTMLElement;
              const newWidth = Math.max(300, Math.min(window.innerWidth * 0.8, startWidth + deltaX));
              const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
              
              target.parentElement!.style.width = `${newWidth}px`;
              target.parentElement!.style.height = `${newHeight}px`;
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="w-full h-full bg-gray-500 rounded-br-2xl"></div>
        </div>
      </aside>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} toothData={toothData} />

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[rgba(25,30,45,0.8)] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl p-6 text-white w-full max-w-xl max-h-[80vh] flex flex-col">
            <header className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-xl font-bold text-blue-300">AI Clinical Summary: Tooth {id}</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-2xl text-gray-400 hover:text-white">&times;</button>
            </header>
            <div className="overflow-y-auto p-4 bg-gray-900/50 rounded-lg flex-grow">
              {isGeneratingReport ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 animate-pulse">Generating clinical summary...</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap font-sans text-slate-200">{aiReport}</p>
              )}
            </div>
            <footer className="mt-4 text-right flex-shrink-0">
              <button onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Close</button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};
