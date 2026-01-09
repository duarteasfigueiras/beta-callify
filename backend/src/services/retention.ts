import { dbRun, dbAll } from '../db/database';
import fs from 'fs';
import path from 'path';

const RETENTION_DAYS = 60;

interface ExpiredCall {
  id: number;
  audio_file_path: string | null;
}

/**
 * Clean up calls older than the retention period (60 days)
 * This deletes:
 * - Audio files from the filesystem
 * - Call records from the database (cascades to criteria results, feedback, alerts)
 */
export async function cleanupExpiredCalls(): Promise<{ deletedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let deletedCount = 0;

  try {
    // Calculate the cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`[Retention] Running cleanup for calls older than ${RETENTION_DAYS} days (before ${cutoffDateStr})`);

    // Find all calls older than the retention period
    const expiredCalls = await dbAll<ExpiredCall>(
      `SELECT id, audio_file_path FROM calls WHERE call_date < ?`,
      [cutoffDateStr]
    );

    if (expiredCalls.length === 0) {
      console.log('[Retention] No expired calls found');
      return { deletedCount: 0, errors: [] };
    }

    console.log(`[Retention] Found ${expiredCalls.length} expired calls to delete`);

    // Delete audio files first
    for (const call of expiredCalls) {
      if (call.audio_file_path) {
        try {
          const audioPath = path.join(__dirname, '..', '..', call.audio_file_path);
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
            console.log(`[Retention] Deleted audio file: ${call.audio_file_path}`);
          }
        } catch (fileError) {
          const errorMsg = `Failed to delete audio file for call ${call.id}: ${fileError}`;
          console.error(`[Retention] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    // Delete call records (cascades to call_criteria_results, call_feedback, alerts due to ON DELETE CASCADE)
    const result = await dbRun(
      `DELETE FROM calls WHERE call_date < ?`,
      [cutoffDateStr]
    );

    deletedCount = result.changes || 0;
    console.log(`[Retention] Deleted ${deletedCount} expired call records`);

    return { deletedCount, errors };
  } catch (error) {
    const errorMsg = `Retention cleanup failed: ${error}`;
    console.error(`[Retention] ${errorMsg}`);
    errors.push(errorMsg);
    return { deletedCount, errors };
  }
}

/**
 * Get retention policy information
 */
export function getRetentionPolicy() {
  return {
    retentionDays: RETENTION_DAYS,
    description: `Calls and recordings are automatically deleted after ${RETENTION_DAYS} days`
  };
}

/**
 * Start the retention cleanup scheduler
 * Runs cleanup daily at midnight
 */
export function startRetentionScheduler() {
  // Run cleanup immediately on startup
  cleanupExpiredCalls().then(result => {
    if (result.deletedCount > 0) {
      console.log(`[Retention] Initial cleanup completed: ${result.deletedCount} calls deleted`);
    }
  }).catch(error => {
    console.error('[Retention] Initial cleanup failed:', error);
  });

  // Schedule daily cleanup (run every 24 hours)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    console.log('[Retention] Running scheduled cleanup...');
    cleanupExpiredCalls().then(result => {
      if (result.deletedCount > 0) {
        console.log(`[Retention] Scheduled cleanup completed: ${result.deletedCount} calls deleted`);
      }
    }).catch(error => {
      console.error('[Retention] Scheduled cleanup failed:', error);
    });
  }, TWENTY_FOUR_HOURS);

  console.log('[Retention] Scheduler started - will run cleanup daily');
}
