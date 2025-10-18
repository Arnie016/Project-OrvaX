/**
 * AI Model Manager - Handles model preloading and optimization
 * Preloads the AI model for better performance during runtime
 */

import { externalAIService } from './externalAIService';

export interface ModelStatus {
  isLoaded: boolean;
  isLoading: boolean;
  lastLoaded: Date | null;
  error: string | null;
}

export interface PreloadOptions {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

class AIModelManager {
  private modelStatus: ModelStatus = {
    isLoaded: false,
    isLoading: false,
    lastLoaded: null,
    error: null
  };

  private preloadOptions: PreloadOptions = {
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 15000
  };

  private retryCount = 0;
  private isPreloading = false;

  /**
   * Get current model status
   */
  getStatus(): ModelStatus {
    return { ...this.modelStatus };
  }

  /**
   * Check if model is ready to use
   */
  isModelReady(): boolean {
    return this.modelStatus.isLoaded && !this.modelStatus.isLoading;
  }

  /**
   * Preload the AI model for better performance
   * This should be called when the app starts
   */
  async preloadModel(): Promise<boolean> {
    if (this.isPreloading) {
      console.log('🔄 Model preloading already in progress...');
      return false;
    }

    if (this.modelStatus.isLoaded) {
      console.log('✅ Model already loaded');
      return true;
    }

    this.isPreloading = true;
    this.modelStatus.isLoading = true;
    this.modelStatus.error = null;

    console.log('🚀 Starting AI model preload...');

    try {
      // Test the external AI endpoint with a simple request
      const testResult = await this.testModelConnection();
      
      if (testResult) {
        this.modelStatus.isLoaded = true;
        this.modelStatus.lastLoaded = new Date();
        this.modelStatus.isLoading = false;
        this.retryCount = 0;
        
        console.log('✅ AI model preloaded successfully');
        return true;
      } else {
        throw new Error('Model test failed');
      }

    } catch (error) {
      console.error('❌ Model preload failed:', error);
      
      this.modelStatus.error = error instanceof Error ? error.message : 'Unknown error';
      this.modelStatus.isLoading = false;
      
      // Retry logic
      if (this.retryCount < this.preloadOptions.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying model preload (${this.retryCount}/${this.preloadOptions.maxRetries})...`);
        
        setTimeout(() => {
          this.isPreloading = false;
          this.preloadModel();
        }, this.preloadOptions.retryDelay);
        
        return false;
      } else {
        console.log('⚠️ Model preload failed after all retries, using fallback mode');
        this.isPreloading = false;
        return false;
      }
    }
  }

  /**
   * Test model connection with a simple request
   */
  private async testModelConnection(): Promise<boolean> {
    try {
      const testMessages = [
        {
          role: 'system' as const,
          content: 'You are a test assistant.'
        },
        {
          role: 'user' as const,
          content: 'Test connection'
        }
      ];

      const response = await externalAIService.generateResponse(testMessages, {
        max_tokens: 10,
        temperature: 0.1
      });

      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('Model connection test failed:', error);
      return false;
    }
  }

  /**
   * Warm up the model with a dummy request
   * This helps reduce first-request latency
   */
  async warmUpModel(): Promise<void> {
    if (!this.isModelReady()) {
      console.log('⚠️ Model not ready, skipping warmup');
      return;
    }

    try {
      console.log('🔥 Warming up AI model...');
      
      const warmupMessages = [
        {
          role: 'system' as const,
          content: 'You are a dental AI assistant.'
        },
        {
          role: 'user' as const,
          content: 'Warmup request for tooth 11 with measurements: {"Pocket Depth": {"buccal": 3, "lingual": 3}}'
        }
      ];

      await externalAIService.generateResponse(warmupMessages, {
        max_tokens: 50,
        temperature: 0.2
      });

      console.log('✅ Model warmed up successfully');
    } catch (error) {
      console.warn('⚠️ Model warmup failed:', error);
    }
  }

  /**
   * Get optimized request options based on model status
   */
  getOptimizedOptions(): {
    max_tokens: number;
    temperature: number;
    timeout: number;
  } {
    if (this.isModelReady()) {
      // Model is ready, use optimal settings
      return {
        max_tokens: 512,
        temperature: 0.2,
        timeout: 10000
      };
    } else {
      // Model not ready, use conservative settings
      return {
        max_tokens: 256,
        temperature: 0.1,
        timeout: 5000
      };
    }
  }

  /**
   * Reset model status (useful for debugging)
   */
  resetModel(): void {
    this.modelStatus = {
      isLoaded: false,
      isLoading: false,
      lastLoaded: null,
      error: null
    };
    this.retryCount = 0;
    this.isPreloading = false;
    console.log('🔄 Model status reset');
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    isOptimized: boolean;
    loadTime: number | null;
    retryCount: number;
    errorRate: number;
  } {
    const loadTime = this.modelStatus.lastLoaded 
      ? Date.now() - this.modelStatus.lastLoaded.getTime()
      : null;

    return {
      isOptimized: this.isModelReady(),
      loadTime,
      retryCount: this.retryCount,
      errorRate: this.modelStatus.error ? 1 : 0
    };
  }
}

// Export singleton instance
export const aiModelManager = new AIModelManager();
