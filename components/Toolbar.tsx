import React from 'react';

interface ToolbarProps {
  onResetCamera: () => void;
  onTogglePlaque: () => void;
  isPlaqueVisible: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onResetCamera, onTogglePlaque, isPlaqueVisible }) => {
  const baseButtonClass = "px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 shadow-lg";

  return (
    <div className="bg-[rgba(25,30,45,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] p-2 rounded-xl flex flex-wrap gap-2 justify-center">
      <button
        onClick={onResetCamera}
        className={`${baseButtonClass} bg-gray-600 text-white hover:bg-gray-500`}
        aria-label="Reset camera view"
      >
        Reset View
      </button>
      <button
        onClick={onTogglePlaque}
        className={`${baseButtonClass} ${
          isPlaqueVisible
            ? 'bg-yellow-500 text-gray-900'
            : 'bg-gray-600 text-white hover:bg-gray-500'
        }`}
        aria-pressed={isPlaqueVisible}
      >
        {isPlaqueVisible ? 'Plaque On' : 'Plaque Off'}
      </button>
    </div>
  );
};

export default Toolbar;