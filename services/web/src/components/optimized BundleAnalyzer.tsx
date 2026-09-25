import React, { useState, useEffect } from 'react';
import { BundleAnalyzer as BundleAnalyzerUtil } from '../../utils/lazy-loading';

interface BundleData {
  modules: Array<{
    name: string;
    size: number;
    dependencies: string[];
  }>;
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    modules: string[];
  }>;
}

interface BundleAnalyzerProps {
  budget?: {
    total: number;
    individual: number;
  };
  onBudgetExceeded?: (report: BudgetReport) => void;
  showDetails?: boolean;
  className?: string;
}

interface BudgetReport {
  total: {
    size: number;
    budget: number;
    exceeded: boolean;
    percentage: number;
  };
  modules: Array<{
    name: string;
    size: number;
    budget: number;
    exceeded: boolean;
    percentage: number;
  }>;
}

/**
 * Bundle size analyzer component
 * Tracks and displays bundle size information with budget enforcement
 */
export function BundleAnalyzer({
  budget = { total: 1024 * 1024, individual: 100 * 1024 }, // 1MB total, 100KB per module
  onBudgetExceeded,
  showDetails = false,
  className = ''
}: BundleAnalyzerProps) {
  const [bundleData, setBundleData] = useState<BundleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetReport, setBudgetReport] = useState<BudgetReport | null>(null);

  // Analyze bundle on mount and when hot module reloads
  useEffect(() => {
    const analyzeBundle = async () => {
      setIsLoading(true);

      try {
        // Get bundle info from Vite HMR or build-time analysis
        const bundleInfo = await BundleAnalyzerUtil.getBundleInfo();

        if (bundleInfo) {
          // Map to our expected format
          const data: BundleData = {
            modules: [],
            totalSize: bundleInfo.size || 0,
            chunks: [{
              name: 'main',
              size: bundleInfo.size || 0,
              modules: []
            }]
          };

          setBundleData(data);

          // Check against budget
          const report = checkBudget(data, budget);
          setBudgetReport(report);

          if (report.total.exceeded || report.modules.some(m => m.exceeded)) {
            onBudgetExceeded?.(report);
          }
        }

        // Listen for HMR updates
        if (import.meta.hot) {
          import.meta.hot.on('vite:afterUpdate', () => {
            setTimeout(analyzeBundle, 100);
          });
        }
      } catch (error) {
        console.warn('Failed to analyze bundle:', error);
      } finally {
        setIsLoading(false);
      }
    };

    analyzeBundle();

    // Set up monitoring for bundle changes
    if (import.meta.hot) {
      BundleAnalyzerUtil.monitorChanges(analyzeBundle);
    }
  }, [budget, onBudgetExceeded]);

  // Check budget compliance
  const checkBudget = (data: BundleData, budget: { total: number; individual: number }): BudgetReport => {
    const total = {
      size: data.totalSize,
      budget: budget.total,
      exceeded: data.totalSize > budget.total,
      percentage: (data.totalSize / budget.total) * 100
    };

    const modules = data.modules.map(module => ({
      name: module.name,
      size: module.size,
      budget: budget.individual,
      exceeded: module.size > budget.individual,
      percentage: (module.size / budget.individual) * 100
    }));

    return { total, modules };
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get color based on budget compliance
  const getBudgetColor = (exceeded: boolean, percentage: number): string => {
    if (exceeded) return 'text-red-600';
    if (percentage > 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className={`bundle-analyzer loading ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!bundleData) {
    return (
      <div className={`bundle-analyzer error ${className}`}>
        <p className="text-red-500 text-sm">Failed to load bundle information</p>
      </div>
    );
  }

  return (
    <div className={`bundle-analyzer ${className}`}>
      {/* Summary */}
      <div className="bundle-summary p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Bundle Size</h3>
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${getBudgetColor(budgetReport?.total.exceeded || false, budgetReport?.total.percentage || 0)}`}>
            {formatBytes(bundleData.totalSize)}
          </span>
          <span className="text-sm text-gray-500">
            of {formatBytes(budget.total)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                budgetReport?.total.exceeded ? 'bg-red-500' :
                (budgetReport?.total.percentage || 0) > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((budgetReport?.total.percentage || 0), 100)}%` }}
            />
          </div>
        </div>

        {budgetReport?.total.exceeded && (
          <p className="text-red-500 text-xs mt-1">
            Budget exceeded by {formatBytes(budgetReport.total.size - budgetReport.total.budget)}
          </p>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="bundle-details mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Module Breakdown</h4>
          <div className="space-y-2">
            {/* Largest modules */}
            {bundleData.modules
              .sort((a, b) => b.size - a.size)
              .slice(0, 10)
              .map((module, index) => {
                const moduleReport = budgetReport?.modules.find(m => m.name === module.name);
                return (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-xs">{module.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${getBudgetColor(moduleReport?.exceeded || false, moduleReport?.percentage || 0)}`}>
                        {formatBytes(module.size)}
                      </span>
                      {moduleReport?.exceeded && (
                        <span className="text-red-500 text-xs">⚠️</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Chunks */}
          <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-4">Chunks</h4>
          <div className="space-y-2">
            {bundleData.chunks.map((chunk, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{chunk.name}</span>
                <span className="text-gray-800">{formatBytes(chunk.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance warnings */}
      {budgetReport && (
        <div className="bundle-warnings mt-4">
          {budgetReport.total.percentage > 80 && !budgetReport.total.exceeded && (
            <p className="text-yellow-600 text-sm">
              ⚠️ Bundle size approaching budget limit
            </p>
          )}
          {budgetReport.modules.some(m => m.exceeded) && (
            <p className="text-red-600 text-sm">
              ❌ {budgetReport.modules.filter(m => m.exceeded).length} modules exceed size budget
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Performance budget enforcement component
 */
export function PerformanceBudget({
  budgets,
  onViolation,
  children
}: {
  budgets: {
    bundleSize?: number;
    loadTime?: number;
    renderTime?: number;
  };
  onViolation?: (type: string, actual: number, budget: number) => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    // Monitor bundle size
    if (budgets.bundleSize) {
      const checkBundleSize = async () => {
        try {
          const bundleInfo = await BundleAnalyzerUtil.getBundleInfo();
          if (bundleInfo && bundleInfo.size && bundleInfo.size > budgets.bundleSize!) {
            onViolation?.('bundleSize', bundleInfo.size, budgets.bundleSize);
          }
        } catch (error) {
          console.warn('Failed to check bundle size:', error);
        }
      };

      checkBundleSize();
    }

    // Monitor load time
    if (budgets.loadTime) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            if (loadTime > budgets.loadTime!) {
              onViolation?.('loadTime', loadTime, budgets.loadTime);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
    }

    // Monitor render time
    if (budgets.renderTime) {
      const measureRenderTime = () => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.startsWith('render-')) {
              if (entry.duration > budgets.renderTime!) {
                onViolation?.('renderTime', entry.duration, budgets.renderTime);
              }
            }
          }
        });

        observer.observe({ entryTypes: ['measure'] });
      };

      measureRenderTime();
    }
  }, [budgets, onViolation]);

  return <>{children}</>;
}

/**
 * Bundle optimization suggestions component
 */
export function BundleOptimizations({
  bundleData,
  className = ''
}: {
  bundleData: BundleData;
  className?: string;
}) {
  const suggestions: Array<{
    type: 'warning' | 'info' | 'error';
    title: string;
    description: string;
    action?: string;
  }> = [];

  // Analyze and generate suggestions
  if (bundleData.totalSize > 1024 * 1024) {
    suggestions.push({
      type: 'error',
      title: 'Large Bundle Size',
      description: 'Bundle exceeds 1MB, which may impact load performance',
      action: 'Consider code splitting and lazy loading'
    });
  }

  const largeModules = bundleData.modules.filter(m => m.size > 100 * 1024);
  if (largeModules.length > 0) {
    suggestions.push({
      type: 'warning',
      title: 'Large Modules Detected',
      description: `${largeModules.length} modules exceed 100KB`,
      action: 'Split these modules into smaller chunks'
    });
  }

  // Check for duplicate dependencies
  const dependencyCount = new Map();
  bundleData.modules.forEach(module => {
    module.dependencies.forEach(dep => {
      dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
    });
  });

  const duplicates = Array.from(dependencyCount.entries()).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    suggestions.push({
      type: 'info',
      title: 'Duplicate Dependencies',
      description: `Found ${duplicates.length} dependencies loaded in multiple modules`,
      action: 'Move to vendor chunk'
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'info',
      title: 'Well Optimized',
      description: 'Bundle size and structure look good',
      action: undefined
    });
  }

  return (
    <div className={`bundle-optimizations ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Optimization Suggestions</h3>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              suggestion.type === 'error' ? 'bg-red-50 border-red-200' :
              suggestion.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-800">{suggestion.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                {suggestion.action && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">{suggestion.action}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}