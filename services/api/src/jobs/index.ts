import cron from 'node-cron';
import { UsageSnapshotJob } from './usage-snapshot.job';

export const initializeJobs = () => {
  if (process.env.ENABLE_JOBS === 'false') {
    console.log('[Jobs] Job scheduling disabled via ENABLE_JOBS');
    return;
  }

  console.log('[Jobs] Initializing background jobs...');

  // Usage Snapshot: Run at 2:00 AM UTC daily
  // '0 2 * * *' = At minute 0 past hour 2
  cron.schedule('0 2 * * *', () => {
    UsageSnapshotJob.run();
  });

  console.log('[Jobs] Scheduled: Usage Snapshot (Daily at 02:00 UTC)');
  console.log('[Jobs] Job initialization complete');
};

export { UsageSnapshotJob };
