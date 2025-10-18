import React, { useState } from 'react';

export const ToothModelGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-semibold z-50"
      >
        ? Help
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-4 bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl p-4 w-96 max-h-[80vh] overflow-y-auto z-40">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-bold text-lg">3D Tooth Models Guide</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-4 text-sm text-gray-300">
        <section>
          <h4 className="text-white font-semibold mb-2">🦷 Tooth Models</h4>
          <p className="mb-2">
            Each tooth is loaded from a .glb 3D model file. The system automatically:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Mirrors right-side teeth from left-side models</li>
            <li>Positions teeth in the correct dental arch location</li>
            <li>Applies periodontal risk visualization</li>
          </ul>
        </section>

        <section>
          <h4 className="text-white font-semibold mb-2">🖱️ Controls</h4>
          <ul className="space-y-2">
            <li>
              <span className="text-blue-400 font-semibold">Single Click:</span> Select a tooth
            </li>
            <li>
              <span className="text-blue-400 font-semibold">Double Click:</span> Open transform controls panel
            </li>
            <li>
              <span className="text-blue-400 font-semibold">Mouse Drag:</span> Rotate camera
            </li>
            <li>
              <span className="text-blue-400 font-semibold">Mouse Wheel:</span> Zoom in/out
            </li>
          </ul>
        </section>

        <section>
          <h4 className="text-white font-semibold mb-2">⚙️ Transform Controls</h4>
          <p className="mb-2">
            After double-clicking a tooth, you can adjust:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Position:</strong> Move tooth in X, Y, Z directions</li>
            <li><strong>Rotation:</strong> Rotate tooth around any axis</li>
            <li><strong>Scale:</strong> Resize tooth (uniform or per-axis)</li>
          </ul>
          <p className="mt-2 text-yellow-400 text-xs">
            💡 Click "Save" to persist your changes to localStorage
          </p>
        </section>

        <section>
          <h4 className="text-white font-semibold mb-2">📁 Model Files</h4>
          <p className="mb-2">Place your .glb files in the project root:</p>
          <div className="bg-gray-800 p-2 rounded text-xs font-mono">
            <div>maxillary_first_molar.glb</div>
            <div>maxillary_second_molar.glb</div>
            <div>maxillary_third_molar.glb</div>
            <div>maxillary_first_premolar.glb</div>
            <div>maxillary_second_premolar.glb</div>
            <div>maxillary_canine.glb</div>
            <div>maxillary_lateral_incisor.glb</div>
            <div>maxillary_left_central_incisor.glb</div>
            <div>mandibular_first_molar.glb</div>
            <div>mandibular_second_molar.glb</div>
            <div>mandibular_third_molar.glb</div>
            <div>mandibular_first_premolar.glb</div>
            <div>mandibular_left_second_premolar.glb</div>
            <div>mandibular_left_canine.glb</div>
            <div>mandibular_left_lateral_incisor.glb</div>
            <div>mandibular_left_central_incisor.glb</div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            If a model file is missing, the system will fall back to procedural geometry.
          </p>
        </section>

        <section>
          <h4 className="text-white font-semibold mb-2">🔄 Mirroring Logic</h4>
          <p className="text-xs">
            The system automatically mirrors models for right-side teeth (1-8, 25-32) 
            by flipping them along the X-axis. Left-side teeth (9-16, 17-24) use models as-is.
          </p>
        </section>
      </div>

      <button
        onClick={() => setIsOpen(false)}
        className="w-full mt-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors font-semibold"
      >
        Got it!
      </button>
    </div>
  );
};

