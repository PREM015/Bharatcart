/**
 * CSV Exporter
 * Purpose: Export reports to CSV format
 */

import { stringify } from 'csv-stringify/sync';
import { logger } from '@/lib/logger';

export class CSVExporter {
  export(data: any[], filename: string = 'report.csv'): Buffer {
    logger.info('Exporting to CSV', { filename, rows: data.length });

    try {
      const csv = stringify(data, {
        header: true,
        columns: Object.keys(data[0] || {}),
      });

      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      logger.error('CSV export failed', { error });
      throw new Error('Failed to export CSV');
    }
  }

  exportWithCustomColumns(
    data: any[],
    columns: Array<{ key: string; header: string }>,
    filename: string = 'report.csv'
  ): Buffer {
    logger.info('Exporting to CSV with custom columns', {
      filename,
      rows: data.length,
    });

    const columnMap = columns.reduce((acc, col) => {
      acc[col.key] = col.header;
      return acc;
    }, {} as Record<string, string>);

    const csv = stringify(data, {
      header: true,
      columns: columnMap,
    });

    return Buffer.from(csv, 'utf-8');
  }
}

export default CSVExporter;
