import React, { useState, useEffect } from 'react';
import { ToothTransform, getDefaultTransform, saveToothTransforms, loadToothTransforms } from '../toothModelMapping';

interface ToothTransformControlsProps {
  toothId: number | null;
  toothName: string;
  onTransformChange: (toothId: number, transform: ToothTransform) => void;
  onClose: () => void;
}

// Add custom styles for the sliders
const sliderStyles = `
  .slider-thumb::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: all 0.15s ease;
  }
  
  .slider-thumb::-webkit-slider-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
    box-shadow: 0 3px 6px rgba(0,0,0,0.4);
  }
  
  .slider-thumb::-webkit-slider-thumb:active {
    transform: scale(1.15);
    background: #1d4ed8;
  }
  
  .slider-thumb::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    transition: all 0.15s ease;
  }
  
  .slider-thumb::-moz-range-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
    box-shadow: 0 3px 6px rgba(0,0,0,0.4);
  }
  
  .slider-thumb::-moz-range-thumb:active {
    transform: scale(1.15);
    background: #1d4ed8;
  }
  
  .slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    border-radius: 10px;
    outline: none;
  }
`;

export const ToothTransformControls: React.FC<ToothTransformControlsProps> = ({
  toothId,
  toothName,
  onTransformChange,
  onClose
}) => {
  const [transform, setTransform] = useState<ToothTransform>(getDefaultTransform());
  const [savedTransforms, setSavedTransforms] = useState<{ [toothId: number]: ToothTransform }>({});

  useEffect(() => {
    const loaded = loadToothTransforms();
    setSavedTransforms(loaded);
    
    if (toothId !== null) {
      setTransform(loaded[toothId] || getDefaultTransform());
    }
  }, [toothId]);

  // Listen for keyboard changes and update display
  useEffect(() => {
    const handleStorageChange = () => {
      const loaded = loadToothTransforms();
      if (toothId !== null && loaded[toothId]) {
        setTransform(loaded[toothId]);
      }
    };

    // Poll for changes (since keyboard updates don't trigger storage events in same window)
    const interval = setInterval(() => {
      const loaded = loadToothTransforms();
      if (toothId !== null && loaded[toothId]) {
        const current = loaded[toothId];
        // Only update if values actually changed
        if (JSON.stringify(current) !== JSON.stringify(transform)) {
          setTransform(current);
        }
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [toothId, transform]);

  if (toothId === null) {
    return null;
  }

  const handleChange = (
    category: 'position' | 'rotation' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: number
  ) => {
    const newTransform = {
      ...transform,
      [category]: {
        ...transform[category],
        [axis]: value
      }
    };
    setTransform(newTransform);
    onTransformChange(toothId, newTransform);
  };

  const handleSave = () => {
    const newSavedTransforms = {
      ...savedTransforms,
      [toothId]: transform
    };
    setSavedTransforms(newSavedTransforms);
    saveToothTransforms(newSavedTransforms);
    alert(`Saved transformations for Tooth #${toothId}`);
  };

  const handleReset = () => {
    const defaultTransform = getDefaultTransform();
    setTransform(defaultTransform);
    onTransformChange(toothId, defaultTransform);
  };

  const handleExportAll = () => {
    const allTransforms = loadToothTransforms();
    const formattedOutput = JSON.stringify(allTransforms, null, 2);
    
    console.log('=== ALL TOOTH TRANSFORMS ===');
    console.log(formattedOutput);
    console.log('=== END TOOTH TRANSFORMS ===');
    
    // Also copy to clipboard
    navigator.clipboard.writeText(formattedOutput).then(() => {
      alert('✅ All tooth transforms copied to clipboard and logged to console!\n\nCheck the browser console (F12) to see the full output.');
    }).catch(() => {
      alert('✅ All tooth transforms logged to console!\n\nCheck the browser console (F12) to see the output.\n\n(Clipboard copy failed - you can copy from console)');
    });
  };

  const handleExportAsCode = () => {
    const allTransforms = loadToothTransforms();
    let code = '// Hardcoded tooth transforms\nexport const TOOTH_TRANSFORMS = {\n';
    
    Object.entries(allTransforms).forEach(([toothId, transform]) => {
      code += `  ${toothId}: {\n`;
      code += `    position: { x: ${transform.position.x}, y: ${transform.position.y}, z: ${transform.position.z} },\n`;
      code += `    rotation: { x: ${transform.rotation.x}, y: ${transform.rotation.y}, z: ${transform.rotation.z} },\n`;
      code += `    scale: { x: ${transform.scale.x}, y: ${transform.scale.y}, z: ${transform.scale.z} }\n`;
      code += `  },\n`;
    });
    
    code += '};\n';
    
    console.log('=== HARDCODED TOOTH TRANSFORMS (TypeScript/JavaScript) ===');
    console.log(code);
    console.log('=== END CODE ===');
    
    navigator.clipboard.writeText(code).then(() => {
      alert('✅ Tooth transforms as code copied to clipboard and logged to console!\n\nReady to paste into your code file.');
    }).catch(() => {
      alert('✅ Tooth transforms as code logged to console!\n\nCheck browser console (F12) and copy the code.');
    });
  };

  const SliderControl = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step 
  }: { 
    label: string; 
    value: number; 
    onChange: (val: number) => void; 
    min: number; 
    max: number; 
    step: number; 
  }) => {
    const [inputValue, setInputValue] = React.useState(value.toFixed(3));

    React.useEffect(() => {
      setInputValue(value.toFixed(3));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        const clampedValue = Math.max(min, Math.min(max, numValue));
        onChange(clampedValue);
        setInputValue(clampedValue.toFixed(3));
      } else {
        setInputValue(value.toFixed(3));
      }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };

    return (
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-300 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value - min) / (max - min)) * 100}%, #374151 ${((value - min) / (max - min)) * 100}%, #374151 100%)`
            }}
          />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-24 px-2 py-1.5 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            placeholder={value.toFixed(3)}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{sliderStyles}</style>
      <div className="absolute top-4 right-4 bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl p-4 w-80 max-h-[90vh] overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white font-bold text-sm">Transform Controls</h3>
          <p className="text-gray-400 text-xs">Tooth #{toothId} - {toothName}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Position Controls */}
      <div className="mb-4">
        <h4 className="text-white font-semibold text-xs mb-2 uppercase tracking-wide">Position <span className="text-gray-500 font-normal">(WASD + Q/E)</span></h4>
        <div className="space-y-2 bg-gray-800/30 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">X (Left/Right)</span>
            <span className="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">{transform.position.x.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Y (Up/Down)</span>
            <span className="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">{transform.position.y.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Z (Forward/Back)</span>
            <span className="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">{transform.position.z.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Rotation Controls */}
      <div className="mb-4">
        <h4 className="text-white font-semibold text-xs mb-2 uppercase tracking-wide">Rotation <span className="text-gray-500 font-normal">(Arrows + R/F)</span></h4>
        <div className="space-y-2 bg-gray-800/30 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Pitch (X)</span>
            <span className="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">{(transform.rotation.x * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Yaw (Y)</span>
            <span className="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">{(transform.rotation.y * 180 / Math.PI).toFixed(1)}°</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Roll (Z)</span>
            <span className="text-sm text-white font-mono bg-gray-700 px-2 py-1 rounded">{(transform.rotation.z * 180 / Math.PI).toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* Scale Controls */}
      <div className="mb-4">
        <h4 className="text-white font-semibold text-xs mb-2 uppercase tracking-wide">Scale <span className="text-gray-500 font-normal">(Z/X keys)</span></h4>
        <div className="space-y-2 bg-gray-800/30 p-3 rounded-lg border border-blue-500/30">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-400 font-semibold">Uniform Size</span>
            <span className="text-lg text-white font-mono bg-gray-700 px-3 py-1 rounded font-bold">{((transform.scale.x + transform.scale.y + transform.scale.z) / 3).toFixed(3)}</span>
          </div>
          <p className="text-xs text-gray-400 italic">
            Press Z to shrink, X to grow
          </p>
        </div>

        {/* Individual Axis Display */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300 mb-2">
            Individual Axes (if modified separately)
          </summary>
          <div className="mt-2 space-y-2 bg-gray-800/20 p-2 rounded text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Width (X)</span>
              <span className="text-gray-300 font-mono">{transform.scale.x.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Height (Y)</span>
              <span className="text-gray-300 font-mono">{transform.scale.y.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Depth (Z)</span>
              <span className="text-gray-300 font-mono">{transform.scale.z.toFixed(3)}</span>
            </div>
          </div>
        </details>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-700">
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors font-semibold"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors font-semibold"
        >
          Save
        </button>
      </div>

      {/* Export All Transforms */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <h4 className="text-white font-semibold text-xs mb-2 uppercase tracking-wide">Export All Positions</h4>
        <div className="flex gap-2">
          <button
            onClick={handleExportAll}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors font-semibold"
            title="Export as JSON"
          >
            📋 Export JSON
          </button>
          <button
            onClick={handleExportAsCode}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors font-semibold"
            title="Export as TypeScript code"
          >
            💾 Export Code
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">
          Exports all tooth transforms for hardcoding later
        </p>
      </div>

      <div className="mt-3 text-xs text-gray-500 italic">
        💡 Tip: Use the big "Uniform Size" slider for easy scaling!
      </div>
    </div>
    </>
  );
};

