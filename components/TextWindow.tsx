import React, { useState, useRef, useCallback, useEffect } from 'react';
import { treatmentAnalysisService, TreatmentAnalysisData, PredictionData } from '../services/treatmentAnalysisService';

interface TextWindowProps {
  isVisible: boolean;
  onClose: () => void;
  selectedToothId?: number | null;
  onTextUpdate?: (text: string) => void;
}

const TextWindow: React.FC<TextWindowProps> = ({ isVisible, onClose, selectedToothId, onTextUpdate }) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 450, height: window.innerHeight - 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 });
  const [showCursorLogo, setShowCursorLogo] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  
  // Data states
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<TreatmentAnalysisData | null>(null);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for loaded data
  const [loadedToothId, setLoadedToothId] = useState<number | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (e.target.classList.contains('drag-handle')) {
        setIsDragging(true);
        setDragOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y
        });
      } else if (e.target.classList.contains('resize-handle')) {
        setIsResizing(true);
        setResizeOffset({
          x: e.clientX - size.width,
          y: e.clientY - size.height
        });
      }
    }
  }, [position, size]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, e.clientX - position.x - resizeOffset.x);
      const newHeight = Math.max(300, e.clientY - position.y - resizeOffset.y);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragOffset, resizeOffset, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleToggleCursorLogo = useCallback(() => {
    setShowCursorLogo(prev => !prev);
  }, []);

  // Update window size on resize
  React.useEffect(() => {
    const handleResize = () => {
      setSize(prev => ({
        ...prev,
        height: window.innerHeight - 20 // Adjust height to maintain 20px from bottom
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Fetch data when tooth is selected
  useEffect(() => {
    if (selectedToothId && selectedToothId !== loadedToothId) {
      setIsLoading(true);
      setError(null);
      
      treatmentAnalysisService.generateAnalysis(selectedToothId)
        .then(data => {
          setAnalysisData(data);
          setLoadedToothId(selectedToothId);
          
          // Update text for TTS
          const fullText = `${data.analysis_text} ${data.prediction}`;
          onTextUpdate?.(fullText);
        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedToothId, loadedToothId, onTextUpdate]);

  if (!isVisible) return null;

  return (
    <div
      ref={windowRef}
      className="fixed z-30 bg-[rgba(25,30,45,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: `${size.width+50}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : (isResizing ? 'nw-resize' : 'default')
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with drag handle and close button */}
      <div className="drag-handle flex items-center justify-between p-2 border-b border-[rgba(255,255,255,0.1)] cursor-grab active:cursor-grabbing bg-[rgba(0,0,0,0.2)]">
        <div className="flex items-center space-x-2">
          <h1 className="text-white font-semibold text-lg">Treatment Analysis Diagnosis</h1>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleToggleCursorLogo}
            className="text-slate-400 hover:text-white transition-colors duration-200 p-1 text-xs rounded hover:bg-[rgba(255,255,255,0.1)]"
            title="Toggle Cursor logo"
          >
            ✨
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200 p-1 rounded hover:bg-[rgba(255,255,255,0.1)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Cursor Logo Overlay */}
      {showCursorLogo && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl font-bold text-white mb-2">I</div>
            <div className="text-6xl text-red-500 mb-2">❤️</div>
            <div className="text-4xl font-bold text-white">CURSOR</div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="p-4 h-full overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar smooth-scroll pr-2 max-w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-slate-300 text-sm">{treatmentAnalysisService.getLoadingMessage()}</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : analysisData ? (
            <div className="text-slate-300 text-sm space-y-2 max-w-full">
              {/* Analysis Text */}
              <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)] break-words max-w-full overflow-hidden">
                <h4 className="text-white font-semibold mb-3 text-xl">Analysis</h4>
                <p className="text-slate-300 text-base leading-relaxed break-words hyphens-auto max-w-full text-justify">{analysisData.analysis_text}</p>
              </div>

              {/* Diagnosis */}
              <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)] break-words max-w-full overflow-hidden">
                <h4 className="text-white font-semibold mb-3 text-xl">Diagnosis</h4>
                <p className="text-slate-300 text-base leading-relaxed break-words hyphens-auto max-w-full text-justify">{analysisData.prediction}</p>
                <div className="mt-3">
                  <span className="text-base text-blue-400 font-medium">Confidence: {(analysisData.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Future Possible Problems */}
              <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)] break-words max-w-full overflow-hidden">
                <h4 className="text-white font-semibold mb-3 text-xl">Future Possible Problems</h4>
                <div className="space-y-2 max-w-full">
                  <div className="text-base break-words max-w-full overflow-hidden">
                    <span className="text-red-400 capitalize text-base font-semibold">High Risk:</span>
                    <p className="text-slate-300 mt-2 text-base leading-relaxed break-words hyphens-auto max-w-full text-justify">Progressive bone loss may lead to tooth mobility and potential tooth loss within 2-3 years if left untreated.</p>
                    <span className="text-base text-red-400 font-medium">Risk Level: 85%</span>
                  </div>
                  <div className="text-base break-words max-w-full overflow-hidden">
                    <span className="text-orange-400 capitalize text-base font-semibold">Medium Risk:</span>
                    <p className="text-slate-300 mt-2 text-base leading-relaxed break-words hyphens-auto max-w-full text-justify">Continued inflammation may result in further attachment loss and increased pocket depths.</p>
                    <span className="text-base text-orange-400 font-medium">Risk Level: 65%</span>
                  </div>
                  <div className="text-base break-words max-w-full overflow-hidden">
                    <span className="text-yellow-400 capitalize text-base font-semibold">Low Risk:</span>
                    <p className="text-slate-300 mt-2 text-base leading-relaxed break-words hyphens-auto max-w-full text-justify">With proper maintenance, the condition can be stabilized and further progression prevented.</p>
                    <span className="text-base text-yellow-400 font-medium">Risk Level: 25%</span>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              {predictions.length > 0 && (
                <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)] break-words max-w-full overflow-hidden">
                  <h4 className="text-white font-semibold mb-3 text-xl">Detailed Analysis</h4>
                  <div className="space-y-3 max-w-full">
                    {predictions.map((pred) => (
                      <div key={pred.id} className="text-base break-words max-w-full overflow-hidden">
                        <span className="text-blue-400 capitalize text-base font-semibold">{pred.prediction_type.replace('_', ' ')}:</span>
                        <p className="text-slate-300 mt-2 text-base leading-relaxed break-words hyphens-auto max-w-full text-justify">{pred.prediction_text}</p>
                        <span className="text-base text-green-400 font-medium">Confidence: {(pred.confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">Select a tooth to view treatment analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* Resize handle in bottom-right corner */}
      <div 
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize"
        style={{
          background: 'linear-gradient(-45deg, transparent 0%, transparent 30%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.3) 50%, transparent 50%, transparent 70%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0.3) 100%)'
        }}
      />
    </div>
  );
};

export default TextWindow;