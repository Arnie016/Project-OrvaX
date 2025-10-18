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
    <div className="bg-[rgba(15,20,30,0.9)] backdrop-blur-xl border border-[rgba(255,255,255,0.15)] p-3 rounded-2xl flex flex-wrap gap-3 justify-center shadow-2xl">
      <button
        onClick={onHelp}
        className="px-4 py-2.5 text-base font-normal rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 border border-blue-500/30 shadow-lg hover:shadow-xl"
        aria-label="Help"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Help</span>
        </div>
      </button>
      
      <button
        onClick={onResetCamera}
        className="px-4 py-2.5 text-base font-normal rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600 border border-slate-500/30 shadow-lg hover:shadow-xl"
        aria-label="Reset camera view"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset View</span>
        </div>
      </button>
      
      <button
        onClick={onTogglePlaque}
        className={`px-4 py-2.5 text-base font-normal rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border shadow-lg hover:shadow-xl ${
          isPlaqueVisible
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 border-yellow-400/50'
            : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600 border-slate-500/30'
        }`}
        aria-pressed={isPlaqueVisible}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isPlaqueVisible ? 'bg-gray-700' : 'bg-yellow-400'}`}></div>
          <span>{isPlaqueVisible ? 'Plaque On' : 'Plaque Off'}</span>
        </div>
      </button>
      
      <button
        onClick={onToggleTextWindow}
        className={`px-4 py-2.5 text-base font-normal rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 border shadow-lg hover:shadow-xl ${
          isTextWindowVisible
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400/50'
            : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600 border-slate-500/30'
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
      
      <button
        onClick={onOverallAnalysis}
        className="px-4 py-2.5 text-base font-normal rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 border border-green-500/30 shadow-lg hover:shadow-xl"
        aria-label="Overall Analysis"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Overall Analysis</span>
        </div>
      </button>
    </div>
  );
};

export default Toolbar;