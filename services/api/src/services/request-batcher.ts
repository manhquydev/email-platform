import { EventEmitter } from 'events';

interface BatchRequest {
  id: string;
  query: string;
  variables?: any;
  operationName?: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  enableBatching: boolean;
}

/**
 * Request batching service for GraphQL and REST APIs
 * Batches similar requests to reduce database load
 */
export class RequestBatcher extends EventEmitter {
  private pendingRequests = new Map<string, BatchRequest[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private config: BatchConfig;

  constructor(config: Partial<BatchConfig> = {}) {
    super();

    this.config = {
      maxBatchSize: 50,
      maxWaitTime: 10, // 10ms
      enableBatching: true,
      ...config,
    };
  }

  /**
   * Batch GraphQL requests
   */
  async batchGraphQLRequest(
    query: string,
    variables?: any,
    operationName?: string
  ): Promise<any> {
    if (!this.config.enableBatching) {
      return this.executeRequest(query, variables, operationName);
    }

    // Generate batch key based on query structure
    const batchKey = this.generateBatchKey(query, operationName);

    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: Math.random().toString(36).substr(2, 9),
        query,
        variables,
        operationName,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add to pending requests
      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
      }

      const batch = this.pendingRequests.get(batchKey)!;
      batch.push(request);

      // Set batch timer if not already set
      if (!this.batchTimers.has(batchKey)) {
        const timer = setTimeout(() => {
          this.flushBatch(batchKey);
        }, this.config.maxWaitTime);

        this.batchTimers.set(batchKey, timer);
      }

      // Flush immediately if batch is full
      if (batch.length >= this.config.maxBatchSize) {
        this.flushBatch(batchKey);
      }
    });
  }

  /**
   * Execute multiple requests in a single batch
   */
  async batchExecute(requests: Array<{
    query: string;
    variables?: any;
    operationName?: string;
  }>): Promise<any[]> {
    // Group requests by batch key
    const batchGroups = new Map<string, typeof requests>();

    requests.forEach((req, index) => {
      const batchKey = this.generateBatchKey(req.query, req.operationName);

      if (!batchGroups.has(batchKey)) {
        batchGroups.set(batchKey, []);
      }

      batchGroups.get(batchKey)!.push({
        ...req,
        originalIndex: index,
      });
    });

    // Execute batches in parallel
    const batchPromises = Array.from(batchGroups.entries()).map(
      async ([batchKey, batch]) => {
        const results = await this.executeBatch(batch);
        return { batchKey, results };
      }
    );

    const batchResults = await Promise.all(batchPromises);

    // Reassemble results in original order
    const finalResults = new Array(requests.length);
    let resultIndex = 0;

    for (const { results } of batchResults) {
      for (const result of results) {
        finalResults[(result as any).originalIndex] = result;
        resultIndex++;
      }
    }

    return finalResults;
  }

  /**
   * Generate batch key for grouping similar requests
   */
  private generateBatchKey(query: string, operationName?: string): string {
    // Normalize query for batching
    const normalizedQuery = query
      .replace(/\s+/g, ' ')
      .replace(/\$(\w+)/g, '$var') // Replace variables with placeholder
      .trim();

    return `${operationName || 'anonymous'}:${Buffer.from(normalizedQuery)
      .toString('base64')
      .slice(0, 50)}`;
  }

  /**
   * Flush a batch of requests
   */
  private async flushBatch(batchKey: string): Promise<void> {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear batch and timer
    this.pendingRequests.delete(batchKey);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    try {
      // Execute batch
      const results = await this.executeBatch(batch);

      // Resolve individual requests
      batch.forEach((request, index) => {
        const result = results[index];
        if (result instanceof Error) {
          request.reject(result);
        } else {
          request.resolve(result);
        }
      });

      // Emit batch execution event
      this.emit('batchExecuted', {
        batchKey,
        size: batch.length,
        duration: Date.now() - batch[0].timestamp,
      });
    } catch (error) {
      // Reject all requests in batch
      batch.forEach(request => {
        request.reject(error);
      });

      this.emit('batchError', {
        batchKey,
        size: batch.length,
        error,
      });
    }
  }

  /**
   * Execute a batch of similar requests
   */
  private async executeBatch(batch: BatchRequest[]): Promise<any[]> {
    if (batch.length === 1) {
      // Single request - execute directly
      const request = batch[0];
      try {
        const result = await this.executeRequest(
          request.query,
          request.variables,
          request.operationName
        );
        return [result];
      } catch (error) {
        return [error];
      }
    }

    // For GraphQL, create a batched query
    if (this.isGraphQLQuery(batch[0].query)) {
      return await this.executeGraphQLBatch(batch);
    }

    // For REST, execute in parallel
    const promises = batch.map(request =>
      this.executeRequest(request.query, request.variables, request.operationName)
        .catch(error => error)
    );

    return Promise.all(promises);
  }

  /**
   * Execute GraphQL batch request
   */
  private async executeGraphQLBatch(batch: BatchRequest[]): Promise<any[]> {
    // Check if all requests have the same structure
    const firstQuery = batch[0].query;
    const allSameQuery = batch.every(req => req.query === firstQuery);

    if (allSameQuery) {
      // Can optimize by single query with multiple variables
      return await this.executeOptimizedGraphQLBatch(batch);
    } else {
      // Execute as separate operations in single request
      return await this.executeMultiOperationBatch(batch);
    }
  }

  /**
   * Execute optimized batch with same query
   */
  private async executeOptimizedGraphQLBatch(batch: BatchRequest[]): Promise<any[]> {
    const query = batch[0].query;
    const operationName = batch[0].operationName;

    // Combine variables into arrays
    const variablesList = batch.map(req => req.variables || {});
    const results: any[] = [];

    // For each request, execute with its variables
    for (const variables of variablesList) {
      try {
        const result = await this.executeRequest(query, variables, operationName);
        results.push(result);
      } catch (error) {
        results.push(error);
      }
    }

    return results;
  }

  /**
   * Execute multiple operations in single request
   */
  private async executeMultiOperationBatch(batch: BatchRequest[]): Promise<any[]> {
    // Create aliases for each operation
    const operations = batch.map((req, index) => ({
      query: req.query.replace(/^\s*(query|mutation|subscription)\s+(\w+)/, (_, type, name) => {
        const alias = `op${index}`;
        return `${type} ${alias}: ${name}`;
      }),
      variables: req.variables,
      operationName: req.operationName,
    }));

    try {
      // Execute all operations
      const results = await this.executeMultiQuery(operations);
      return results;
    } catch (error) {
      // Return error for all requests
      return batch.map(() => error);
    }
  }

  /**
   * Check if query is GraphQL
   */
  private isGraphQLQuery(query: string): boolean {
    const trimmed = query.trim();
    return (
      trimmed.startsWith('query') ||
      trimmed.startsWith('mutation') ||
      trimmed.startsWith('subscription') ||
      trimmed.startsWith('{')
    );
  }

  /**
   * Execute single request
   */
  private async executeRequest(
    query: string,
    variables?: any,
    operationName?: string
  ): Promise<any> {
    // This would integrate with your GraphQL executor
    // For now, return a mock result
    return { data: null, errors: null };
  }

  /**
   * Execute multiple GraphQL operations
   */
  private async executeMultiQuery(operations: any[]): Promise<any[]> {
    // This would integrate with your GraphQL executor
    // For now, return mock results
    return operations.map(() => ({ data: null, errors: null }));
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    pendingBatches: number;
    pendingRequests: number;
    config: BatchConfig;
  } {
    const pendingRequests = Array.from(this.pendingRequests.values())
      .reduce((sum, batch) => sum + batch.length, 0);

    return {
      pendingBatches: this.pendingRequests.size,
      pendingRequests,
      config: this.config,
    };
  }

  /**
   * Clear all pending requests
   */
  clearPending(): void {
    // Reject all pending requests
    for (const batch of this.pendingRequests.values()) {
      for (const request of batch) {
        request.reject(new Error('Request cancelled'));
      }
    }

    // Clear timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }

    this.pendingRequests.clear();
    this.batchTimers.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
const requestBatcher = new RequestBatcher();
export default requestBatcher;

// Export class for testing
export { RequestBatcher, BatchRequest, BatchConfig };