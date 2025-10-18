import React, { useState, useEffect } from 'react';
import { aiModelManager, ModelStatus } from '../services/aiModelManager';

interface ModelStatusIndicatorProps {
  className?: string;
}

export const ModelStatusIndicator: React.FC<ModelStatusIndicatorProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<ModelStatus>(aiModelManager.getStatus());
  const [metrics, setMetrics] = useState(aiModelManager.getPerformanceMetrics());

  useEffect(() => {
    // Update status every 2 seconds
    const interval = setInterval(() => {
      setStatus(aiModelManager.getStatus());
      setMetrics(aiModelManager.getPerformanceMetrics());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.isLoading) return 'text-yellow-500';
    if (status.isLoaded) return 'text-green-500';
    if (status.error) return 'text-red-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (status.isLoading) return 'Loading AI Model...';
    if (status.isLoaded) return 'AI Model Ready';
    if (status.error) return 'AI Model Error';
    return 'AI Model Offline';
  };

  const getStatusIcon = () => {
    if (status.isLoading) return '⏳';
    if (status.isLoaded) return '✅';
    if (status.error) return '❌';
    return '⚪';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <span className="text-sm">{getStatusIcon()}</span>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      {status.isLoaded && (
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          <span>⚡</span>
          <span>Optimized</span>
        </div>
      )}
      
      {status.error && (
        <div className="flex items-center space-x-1 text-xs text-red-400">
          <span>🔄</span>
          <span>Fallback</span>
        </div>
      )}
    </div>
  );
};

export default ModelStatusIndicator;
