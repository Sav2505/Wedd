import cron from 'node-cron';
import { pool } from '../db/pool';

export async function expireRidePostsOnce(): Promise<void> {
  await pool.query(
    `UPDATE ride_posts
        SET status = 'expired', contact_phone = NULL, updated_at = NOW()
      WHERE status <> 'expired' AND expires_at <= NOW()`,
  );
  await pool.query(
    `DELETE FROM ride_posts
      WHERE status = 'expired' AND expires_at <= NOW() - INTERVAL '7 days'`,
  );
}

export function initRideExpirationJob(): void {
  cron.schedule('0 3 * * *', () => {
    expireRidePostsOnce().catch((error) => {
      console.error('[Ride Expiration] run failed:', error?.message ?? error);
    });
  }, { timezone: 'Asia/Jerusalem' });
}