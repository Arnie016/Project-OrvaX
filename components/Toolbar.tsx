import React from 'react';

interface ToolbarProps {
  onResetCamera: () => void;
  onTogglePlaque: () => void;
  isPlaqueVisible: boolean;
  onToggleTextWindow: () => void;
  isTextWindowVisible: boolean;
  onOverallAnalysis: () => void;
  onHelp: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onResetCamera, onTogglePlaque, isPlaqueVisible, onToggleTextWindow, isTextWindowVisible, onOverallAnalysis, onHelp }) => {
  const baseButtonClass = "px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 shadow-lg";

  return (
    <div className="relative group">
      {/* Simple container without outer frame - always visible */}
      <div className="flex flex-wrap gap-3 justify-center p-4">
            {/* Help Button with corner frames and reflection - always visible but subtle */}
            <div className="relative group/btn">
              {/* Corner L-frames - stronger LED effect */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-purple-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-purple-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-purple-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-purple-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              
              {/* Glow effect - stronger spread on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/20 to-purple-600/20 rounded-lg blur opacity-25 group-hover/btn:opacity-80 group-hover/btn:scale-110 transition-all duration-300"></div>
              
              <button
                onClick={onHelp}
                className="relative px-4 py-2.5 text-base font-normal rounded-lg bg-gray-800/60 text-purple-300/50 hover:text-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-600/30 hover:border-purple-400"
                aria-label="Help"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Help</span>
                </div>
              </button>
              
              {/* Reflection effect - very subtle */}
              <div className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-purple-400/5 to-transparent opacity-10 group-hover/btn:opacity-100 transition-all duration-300 transform scale-y-[-1] blur-sm"></div>
            </div>
      
            {/* Reset Camera Button with corner frames and reflection - always visible but subtle */}
            <div className="relative group/btn">
              {/* Corner L-frames - stronger LED effect */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-pink-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-pink-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-pink-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-pink-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              
              {/* Glow effect - stronger spread on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-400/20 to-red-500/20 rounded-lg blur opacity-25 group-hover/btn:opacity-80 group-hover/btn:scale-110 transition-all duration-300"></div>
              
              <button
                onClick={onResetCamera}
                className="relative px-4 py-2.5 text-base font-normal rounded-lg bg-gray-800/60 text-pink-300/50 hover:text-pink-200 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-600/30 hover:border-pink-400"
                aria-label="Reset camera view"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset View</span>
                </div>
              </button>
              
              {/* Reflection effect - very subtle */}
              <div className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-pink-400/5 to-transparent opacity-10 group-hover/btn:opacity-100 transition-all duration-300 transform scale-y-[-1] blur-sm"></div>
            </div>
      
  
            {/* Tooth Analysis Button with corner frames and reflection - always visible but subtle */}
            <div className="relative group/btn">
              {/* Corner L-frames - stronger LED effect */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-cyan-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-cyan-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-cyan-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-cyan-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              
              {/* Glow effect - stronger spread on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-lg blur opacity-25 group-hover/btn:opacity-80 group-hover/btn:scale-110 transition-all duration-300"></div>
              
              <button
                onClick={onToggleTextWindow}
                className={`relative px-4 py-2.5 text-base font-normal rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border ${
                  isTextWindowVisible
                    ? 'bg-gray-800/60 text-cyan-300/50 hover:text-cyan-200 border-cyan-400'
                    : 'bg-gray-800/60 text-cyan-300/50 hover:text-cyan-200 border-gray-600/30 hover:border-cyan-400'
                }`}
                aria-pressed={isTextWindowVisible}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Tooth Analysis</span>
                </div>
              </button>
              
              {/* Reflection effect - very subtle */}
              <div className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-cyan-400/5 to-transparent opacity-10 group-hover/btn:opacity-100 transition-all duration-300 transform scale-y-[-1] blur-sm"></div>
            </div>
      
            {/* Overall Analysis Button with corner frames and reflection - always visible but subtle */}
            <div className="relative group/btn">
              {/* Corner L-frames - stronger LED effect */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-l-2 border-t-2 border-lime-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 border-r-2 border-t-2 border-lime-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-2 border-b-2 border-lime-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-2 border-b-2 border-lime-400/40 opacity-40 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:scale-110"></div>
              
              {/* Glow effect - stronger spread on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-lime-400/20 to-green-500/20 rounded-lg blur opacity-25 group-hover/btn:opacity-80 group-hover/btn:scale-110 transition-all duration-300"></div>
              
              <button
                onClick={onOverallAnalysis}
                className="relative px-4 py-2.5 text-base font-normal rounded-lg bg-gray-800/60 text-lime-300/50 hover:text-lime-200 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-600/30 hover:border-lime-400"
                aria-label="Overall Analysis"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Overall Analysis</span>
                </div>
              </button>
              
              {/* Reflection effect - more visible from behind */}
              <div className="absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-lime-400/5 to-transparent opacity-10 group-hover/btn:opacity-100 transition-all duration-300 transform scale-y-[-1] blur-sm"></div>
            </div>
      </div>
    </div>
  );
};

export default Toolbar;