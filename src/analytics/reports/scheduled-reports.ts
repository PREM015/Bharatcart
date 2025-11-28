/**
 * Scheduled Reports
 * Purpose: Schedule automated report generation
 */

import cron from 'node-cron';
import { logger } from '@/lib/logger';

export class ScheduledReports {
  scheduleDaily(hour: number, callback: () => Promise<void>): void {
    cron.schedule(`0 ${hour} * * *`, async () => {
      logger.info('Running daily report');
      await callback();
    });
  }

  scheduleWeekly(dayOfWeek: number, hour: number, callback: () => Promise<void>): void {
    cron.schedule(`0 ${hour} * * ${dayOfWeek}`, async () => {
      logger.info('Running weekly report');
      await callback();
    });
  }

  scheduleMonthly(dayOfMonth: number, hour: number, callback: () => Promise<void>): void {
    cron.schedule(`0 ${hour} ${dayOfMonth} * *`, async () => {
      logger.info('Running monthly report');
      await callback();
    });
  }
}

export default ScheduledReports;
