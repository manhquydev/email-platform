import { performance } from 'perf_hooks';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

interface MemoryLeakAlert {
  type: 'heap' | 'rss' | 'external';
  current: number;
  threshold: number;
  increase: number;
  duration: number;
}

interface ObjectTracking {
  constructorName: string;
  count: number;
  size: number;
  lastSeen: number;
}

/**
 * Memory leak detection and optimization service
 * Monitors memory usage patterns and identifies potential leaks
 */
export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private trackedObjects = new Map<string, ObjectTracking>();
  private alerts: MemoryLeakAlert[] = [];
  private logStream: WriteStream | null = null;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  // Thresholds (in MB)
  private readonly HEAP_THRESHOLD = 500;
  private readonly RSS_THRESHOLD = 1024;
  private readonly EXTERNAL_THRESHOLD = 100;
  private readonly GROWTH_RATE_THRESHOLD = 0.1; // 10% growth

  // Monitoring intervals
  private readonly SNAPSHOT_INTERVAL = 30000; // 30 seconds
  private readonly MAX_SNAPSHOTS = 240; // 2 hours of data
  private readonly LEAK_DETECTION_WINDOW = 600000; // 10 minutes

  constructor() {
    this.setupLogging();
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 Starting memory leak detection...');

    this.monitorInterval = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemoryUsage();
    }, this.SNAPSHOT_INTERVAL);

    // Initial snapshot
    this.takeSnapshot();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    console.log('⏹️ Memory leak detection stopped');
    this.generateReport();
  }

  /**
   * Take memory snapshot
   */
  private takeSnapshot(): void {
    const memUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      arrayBuffers: Math.round((memUsage.arrayBuffers || 0) / 1024 / 1024), // MB
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    // Log snapshot
    this.log(`Memory: Heap=${snapshot.heapUsed}MB RSS=${snapshot.rss}MB External=${snapshot.external}MB`);
  }

  /**
   * Analyze memory usage for leaks
   */
  private analyzeMemoryUsage(): void {
    if (this.snapshots.length < 3) {
      return; // Need at least 3 snapshots for analysis
    }

    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    const baseline = this.snapshots[0];

    // Check for sudden increases
    this.checkSuddenIncrease(current, previous);

    // Check for sustained growth
    this.checkSustainedGrowth(current, baseline);

    // Check thresholds
    this.checkThresholds(current);

    // Analyze object tracking
    this.analyzeObjectTracking();
  }

  /**
   * Check for sudden memory increases
   */
  private checkSuddenIncrease(current: MemorySnapshot, previous: MemorySnapshot): void {
    const heapIncrease = (current.heapUsed - previous.heapUsed) / previous.heapUsed;
    const rssIncrease = (current.rss - previous.rss) / previous.rss;

    if (heapIncrease > this.GROWTH_RATE_THRESHOLD) {
      this.alert('heap', current.heapUsed, previous.heapUsed, heapIncrease, 0);
    }

    if (rssIncrease > this.GROWTH_RATE_THRESHOLD) {
      this.alert('rss', current.rss, previous.rss, rssIncrease, 0);
    }
  }

  /**
   * Check for sustained memory growth
   */
  private checkSustainedGrowth(current: MemorySnapshot, baseline: MemorySnapshot): void {
    const duration = current.timestamp - baseline.timestamp;

    if (duration > this.LEAK_DETECTION_WINDOW) {
      const heapGrowth = (current.heapUsed - baseline.heapUsed) / baseline.heapUsed;
      const rssGrowth = (current.rss - baseline.rss) / baseline.rss;

      if (heapGrowth > this.GROWTH_RATE_THRESHOLD * 2) {
        this.alert('heap', current.heapUsed, baseline.heapUsed, heapGrowth, duration);
      }

      if (rssGrowth > this.GROWTH_RATE_THRESHOLD * 2) {
        this.alert('rss', current.rss, baseline.rss, rssGrowth, duration);
      }
    }
  }

  /**
   * Check if memory exceeds thresholds
   */
  private checkThresholds(current: MemorySnapshot): void {
    if (current.heapUsed > this.HEAP_THRESHOLD) {
      this.warn(`Heap memory exceeds threshold: ${current.heapUsed}MB > ${this.HEAP_THRESHOLD}MB`);
    }

    if (current.rss > this.RSS_THRESHOLD) {
      this.warn(`RSS memory exceeds threshold: ${current.rss}MB > ${this.RSS_THRESHOLD}MB`);
    }

    if (current.external > this.EXTERNAL_THRESHOLD) {
      this.warn(`External memory exceeds threshold: ${current.external}MB > ${this.EXTERNAL_THRESHOLD}MB`);
    }
  }

  /**
   * Create memory leak alert
   */
  private alert(
    type: 'heap' | 'rss' | 'external',
    current: number,
    previous: number,
    increase: number,
    duration: number
  ): void {
    const alert: MemoryLeakAlert = {
      type,
      current,
      threshold: type === 'heap' ? this.HEAP_THRESHOLD : this.RSS_THRESHOLD,
      increase,
      duration,
    };

    this.alerts.push(alert);
    this.warn(`Potential memory leak detected: ${type} grew ${(increase * 100).toFixed(1)}% to ${current}MB`);

    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Track object instances
   */
  trackObject(constructor: Function): void {
    const name = constructor.name;
    const tracked = this.trackedObjects.get(name);

    if (tracked) {
      tracked.count++;
      tracked.lastSeen = Date.now();
    } else {
      this.trackedObjects.set(name, {
        constructorName: name,
        count: 1,
        size: 0,
        lastSeen: Date.now(),
      });
    }
  }

  /**
   * Untrack object instance
   */
  untrackObject(constructor: Function): void {
    const name = constructor.name;
    const tracked = this.trackedObjects.get(name);

    if (tracked && tracked.count > 0) {
      tracked.count--;
    }
  }

  /**
   * Analyze tracked objects for leaks
   */
  private analyzeObjectTracking(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [name, tracking] of this.trackedObjects.entries()) {
      if (now - tracking.lastSeen > staleThreshold && tracking.count > 0) {
        this.warn(`Potential object leak: ${tracking.count} instances of ${name} not garbage collected`);
      }
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): {
    current: MemorySnapshot;
    trend: { heap: number; rss: number; external: number };
    alerts: MemoryLeakAlert[];
    trackedObjects: ObjectTracking[];
  } {
    const current = this.snapshots[this.snapshots.length - 1];
    const trend = { heap: 0, rss: 0, external: 0 };

    if (this.snapshots.length >= 2) {
      const previous = this.snapshots[this.snapshots.length - 2];
      trend.heap = current.heapUsed - previous.heapUsed;
      trend.rss = current.rss - previous.rss;
      trend.external = current.external - previous.external;
    }

    return {
      current,
      trend,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      trackedObjects: Array.from(this.trackedObjects.values()),
    };
  }

  /**
   * Generate memory report
   */
  private generateReport(): void {
    const stats = this.getMemoryStats();
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.snapshots.length * this.SNAPSHOT_INTERVAL,
      memory: stats.current,
      trend: stats.trend,
      alerts: this.alerts,
      trackedObjects: stats.trackedObjects,
    };

    this.log('\n📊 Memory Leak Detection Report');
    this.log(JSON.stringify(report, null, 2));
  }

  /**
   * Setup logging
   */
  private setupLogging(): void {
    const logPath = join(process.cwd(), 'logs', 'memory-leaks.log');

    try {
      this.logStream = createWriteStream(logPath, { flags: 'a' });
    } catch (error) {
      console.error('Failed to setup memory leak logging:', error);
    }
  }

  /**
   * Log message
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    console.log(message);

    if (this.logStream) {
      this.logStream.write(logLine);
    }
  }

  /**
   * Log warning
   */
  private warn(message: string): void {
    this.log(`⚠️ ${message}`);
  }

  /**
   * Force garbage collection
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
      this.log('Forced garbage collection');
    } else {
      this.warn('Garbage collection not available (run with --expose-gc)');
    }
  }

  /**
   * Clear tracked objects
   */
  clearTrackedObjects(): void {
    this.trackedObjects.clear();
    this.log('Cleared tracked objects');
  }

  /**
   * Close detector
   */
  close(): void {
    this.stopMonitoring();

    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

// Export singleton instance
const memoryLeakDetector = new MemoryLeakDetector();
export default memoryLeakDetector;

// Export class for testing
export { MemoryLeakDetector, MemorySnapshot, MemoryLeakAlert, ObjectTracking };