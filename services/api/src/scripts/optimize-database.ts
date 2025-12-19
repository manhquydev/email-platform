import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const prisma = new PrismaClient();

interface QueryAnalysis {
  query: string;
  executionTime: number;
  rows: number;
  indexUsage: string;
  recommendations: string[];
}

class DatabaseOptimizer {
  private readonly slowQueryThreshold = 100; // ms
  private readonly logFile = './optimization-results.log';

  async runOptimization() {
    console.log('Starting database optimization...');
    this.log('Database optimization started');

    try {
      // 1. Analyze slow queries
      await this.analyzeSlowQueries();

      // 2. Check index usage
      await this.analyzeIndexUsage();

      // 3. Identify missing indexes
      await this.identifyMissingIndexes();

      // 4. Analyze table statistics
      await this.updateTableStatistics();

      // 5. Implement partitioning for large tables
      await this.setupPartitioning();

      // 6. Configure connection pooling
      await this.configureConnectionPooling();

      // 7. Set up read replicas
      await this.configureReadReplicas();

      this.log('Database optimization completed successfully');
    } catch (error) {
      this.log(`Optimization failed: ${error.message}`);
      throw error;
    }
  }

  private async analyzeSlowQueries() {
    console.log('Analyzing slow queries...');

    // Enable query logging temporarily
    await prisma.$executeRaw`
      ALTER SYSTEM SET log_min_duration_statement = 100;
      ALTER SYSTEM SET log_statement = 'all';
      SELECT pg_reload_conf();
    `;

    // Wait for some queries to execute
    await new Promise(resolve => setTimeout(resolve, 60000));

    // Analyze slow query log
    const slowQueries = await this.getSlowQueries();

    for (const query of slowQueries) {
      await this.optimizeQuery(query);
    }

    // Disable query logging
    await prisma.$executeRaw`
      ALTER SYSTEM RESET log_min_duration_statement;
      ALTER SYSTEM RESET log_statement;
      SELECT pg_reload_conf();
    `;

    this.log(`Analyzed ${slowQueries.length} slow queries`);
  }

  private async getSlowQueries(): Promise<QueryAnalysis[]> {
    const result = await prisma.$queryRaw`
      SELECT
        query,
        mean_exec_time,
        calls,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements
      WHERE mean_exec_time > ${this.slowQueryThreshold}
      ORDER BY mean_exec_time DESC
      LIMIT 20
    ` as any[];

    return result.map(row => ({
      query: row.query,
      executionTime: row.mean_exec_time,
      rows: row.rows,
      indexUsage: `${row.hit_percent.toFixed(2)}%`,
      recommendations: this.generateQueryRecommendations(row)
    }));
  }

  private generateQueryRecommendations(query: any): string[] {
    const recommendations: string[] = [];
    const sql = query.query.toLowerCase();

    // Check for missing WHERE clause
    if (sql.includes('select') && !sql.includes('where') && !sql.includes('limit')) {
      recommendations.push('Add WHERE clause to limit rows returned');
    }

    // Check for SELECT *
    if (sql.includes('select *')) {
      recommendations.push('Specify only required columns instead of SELECT *');
    }

    // Check for missing indexes
    if (sql.includes('where') && query.rows > 10000 && parseFloat(query.hit_percent) < 95) {
      recommendations.push('Consider adding index on WHERE clause columns');
    }

    // Check for ORDER BY without index
    if (sql.includes('order by') && parseFloat(query.hit_percent) < 90) {
      recommendations.push('Add index to support ORDER BY clause');
    }

    // Check for JOIN without proper indexes
    if (sql.includes('join') && query.executionTime > 500) {
      recommendations.push('Ensure foreign key columns are indexed');
    }

    return recommendations;
  }

  private async optimizeQuery(analysis: QueryAnalysis) {
    console.log(`Optimizing query: ${analysis.query.substring(0, 100)}...`);

    for (const recommendation of analysis.recommendations) {
      console.log(`  Recommendation: ${recommendation}`);

      // Generate EXPLAIN ANALYZE
      try {
        const explainResult = await prisma.$queryRawUnsafe`
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${analysis.query}
        ` as any[];

        this.log(`Query analysis: ${JSON.stringify(explainResult[0])}`);
      } catch (error) {
        this.log(`Failed to analyze query: ${error.message}`);
      }
    }
  }

  private async analyzeIndexUsage() {
    console.log('Analyzing index usage...');

    const unusedIndexes = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE idx_scan < 100
      AND idx_scan > 0
      ORDER BY idx_scan ASC
    ` as any[];

    for (const index of unusedIndexes) {
      console.log(`Unused index found: ${index.schemaname}.${index.tablename}.${index.indexname}`);

      // Consider dropping unused indexes
      if (index.idx_scan < 10) {
        this.log(`Consider dropping unused index: ${index.indexname}`);
      }
    }

    // Get table sizes
    const tableSizes = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
    ` as any[];

    console.log('Table sizes:');
    for (const table of tableSizes) {
      console.log(`  ${table.tablename}: ${table.size}`);
    }

    this.log(`Found ${unusedIndexes.length} potentially unused indexes`);
  }

  private async identifyMissingIndexes() {
    console.log('Identifying missing indexes...');

    // Analyze frequently used WHERE clauses
    const whereClauses = await prisma.$queryRaw`
      SELECT
        query,
        calls
      FROM pg_stat_statements
      WHERE query LIKE '%WHERE%'
      ORDER BY calls DESC
      LIMIT 50
    ` as any[];

    for (const stmt of whereClauses) {
      const columns = this.extractColumnsFromWhere(stmt.query);

      for (const column of columns) {
        const [table, col] = column.split('.');
        await this.checkAndSuggestIndex(table, col);
      }
    }

    // Check for foreign keys without indexes
    const fkWithoutIndexes = await prisma.$queryRaw`
      SELECT
        tc.table_schema,
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = tc.table_schema
        AND tablename = tc.table_name
        AND indexdef LIKE '%' || kcu.column_name || '%'
      )
    ` as any[];

    for (const fk of fkWithoutIndexes) {
      console.log(`Foreign key without index: ${fk.table_name}.${fk.column_name}`);

      const indexName = `idx_${fk.table_name}_${fk.column_name}`;
      await this.createIndex(fk.table_name, fk.column_name, indexName);
    }

    this.log(`Identified and created missing indexes for ${fkWithoutIndexes.length} foreign keys`);
  }

  private extractColumnsFromWhere(query: string): string[] {
    const whereMatch = query.match(/where\s+([^;]+)/i);
    if (!whereMatch) return [];

    const whereClause = whereMatch[1];
    const columns: string[] = [];

    // Extract column names from WHERE clause
    const patterns = [
      /(\w+\.\w+)\s*=/g,
      /(\w+\.\w+)\s*>/g,
      /(\w+\.\w+)\s*</g,
      /(\w+\.\w+)\s+in\s*\(/gi,
      /(\w+\.\w+)\s+like\s*/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(whereClause)) !== null) {
        columns.push(match[1]);
      }
    }

    return [...new Set(columns)]; // Remove duplicates
  }

  private async checkAndSuggestIndex(table: string, column: string) {
    const existingIndexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = '${table}'
      AND indexdef LIKE '%${column}%'
    ` as any[];

    if (existingIndexes.length === 0) {
      console.log(`Suggesting index for ${table}.${column}`);
      const indexName = `idx_${table}_${column}_auto`;
      await this.createIndex(table, column, indexName);
    }
  }

  private async createIndex(table: string, column: string, indexName: string) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "${indexName}"
        ON "${table}" ("${column}")
      `);
      this.log(`Created index: ${indexName} on ${table}.${column}`);
    } catch (error) {
      this.log(`Failed to create index ${indexName}: ${error.message}`);
    }
  }

  private async updateTableStatistics() {
    console.log('Updating table statistics...');

    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    ` as any[];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ANALYZE "${table.tablename}"`);
        console.log(`Updated statistics for ${table.tablename}`);
      } catch (error) {
        this.log(`Failed to analyze ${table.tablename}: ${error.message}`);
      }
    }

    // Set up auto-analyze
    await prisma.$executeRaw`
      ALTER SYSTEM SET default_statistics_target = 1000;
      SELECT pg_reload_conf();
    `;

    this.log('Table statistics updated');
  }

  private async setupPartitioning() {
    console.log('Setting up table partitioning...');

    // Check for large tables that might benefit from partitioning
    const largeTables = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
        AND pg_total_relation_size(schemaname||'.'||tablename) > 1000000000 -- > 1GB
      ORDER BY size_bytes DESC
    ` as any[];

    for (const table of largeTables) {
      const sizeGB = (table.size_bytes / (1024 * 1024 * 1024)).toFixed(2);
      console.log(`Large table: ${table.tablename} (${sizeGB} GB)`);

      // Check if messages table needs partitioning by date
      if (table.tablename === 'messages') {
        await this.partitionMessagesTable();
      }
    }

    this.log('Partitioning setup completed');
  }

  private async partitionMessagesTable() {
    console.log('Setting up partitioning for messages table...');

    // Check if already partitioned
    const isPartitioned = await prisma.$queryRaw`
      SELECT inhparent IS NOT NULL
      FROM pg_inherits
      WHERE inhrelid = 'public.messages'::regclass
    ` as any[];

    if (isPartitioned.length === 0) {
      try {
        // Create partitioned table
        await prisma.$executeRaw`
          CREATE TABLE messages_partitioned (
            LIKE messages INCLUDING ALL
          ) PARTITION BY RANGE (created_at);
        `;

        // Create partitions for each month
        const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
                       '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
                       '2025-01', '2025-02', '2025-03'];

        for (let i = 0; i < months.length - 1; i++) {
          const startMonth = months[i];
          const endMonth = months[i + 1];

          await prisma.$executeRawUnsafe(`
            CREATE TABLE messages_${startMonth.replace('-', '_')}
            PARTITION OF messages_partitioned
            FOR VALUES FROM ('${startMonth}-01') TO ('${endMonth}-01')
          `);
        }

        console.log('Messages table partitioning setup completed');
        this.log('Messages table partitioned by month');
      } catch (error) {
        this.log(`Failed to partition messages table: ${error.message}`);
      }
    }
  }

  private async configureConnectionPooling() {
    console.log('Configuring connection pooling...');

    // PgBouncer configuration
    const pgbouncerConfig = `
[databases]
tempmail_pro = host=localhost port=5432 dbname=tempmail_pro

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
admin_users = postgres
stats_users = stats, postgres
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
max_db_connections = 100
max_user_connections = 100
server_reset_query = DISCARD ALL
ignore_startup_parameters = extra_float_digits
track_extra_parameters = search_path
application_name_add_host = 1
    `;

    await fs.writeFile('/tmp/pgbouncer.ini', pgbouncerConfig);
    this.log('PgBouncer configuration generated');

    // Update Prisma connection string to use PgBouncer
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const pooledUrl = connectionString.replace(':5432', ':6432');
      console.log(`Use this connection string with PgBouncer: ${pooledUrl}`);
      this.log(`PgBouncer connection string: ${pooledUrl}`);
    }
  }

  private async configureReadReplicas() {
    console.log('Configuring read replicas...');

    // Check for replica servers
    const replicas = await prisma.$queryRaw`
      SELECT application_name, state, sync_state
      FROM pg_stat_replication
    ` as any[];

    console.log(`Found ${replicas.length} replica servers`);

    for (const replica of replicas) {
      console.log(`  ${replica.application_name}: ${replica.state} (${replica.sync_state})`);
    }

    // Generate read replica configuration for Prisma
    const replicaConfig = {
      url: process.env.DATABASE_URL,
      replicas: replicas.map(replica => ({
        host: replica.application_name,
        port: 5432,
        database: 'tempmail_pro',
        ssl: true,
      }))
    };

    await fs.writeFile(
      '/tmp/prisma-replica-config.json',
      JSON.stringify(replicaConfig, null, 2)
    );

    this.log('Read replica configuration generated');
  }

  private async cleanup() {
    // Remove temporary files
    try {
      await fs.unlink('/tmp/pgbouncer.ini');
      await fs.unlink('/tmp/prisma-replica-config.json');
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    fs.appendFile(this.logFile, logMessage).catch(console.error);
    console.log(message);
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new DatabaseOptimizer();
  optimizer.runOptimization()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Optimization failed:', error);
      process.exit(1);
    });
}

export default DatabaseOptimizer;