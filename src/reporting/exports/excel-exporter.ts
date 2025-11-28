/**
 * Excel Exporter
 * Purpose: Export reports to Excel format
 */

import ExcelJS from 'exceljs';
import { logger } from '@/lib/logger';

export class ExcelExporter {
  async export(
    data: any[],
    sheetName: string = 'Report',
    filename: string = 'report.xlsx'
  ): Promise<Buffer> {
    logger.info('Exporting to Excel', { filename, rows: data.length });

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      if (data.length === 0) {
        return await workbook.xlsx.writeBuffer() as Buffer;
      }

      const columns = Object.keys(data[0]).map(key => ({
        header: key,
        key,
        width: 15,
      }));

      worksheet.columns = columns;
      worksheet.addRows(data);

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      return await workbook.xlsx.writeBuffer() as Buffer;
    } catch (error) {
      logger.error('Excel export failed', { error });
      throw new Error('Failed to export Excel');
    }
  }

  async exportMultiSheet(
    sheets: Array<{ name: string; data: any[] }>,
    filename: string = 'report.xlsx'
  ): Promise<Buffer> {
    logger.info('Exporting multi-sheet Excel', { filename, sheets: sheets.length });

    const workbook = new ExcelJS.Workbook();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name);

      if (sheet.data.length > 0) {
        const columns = Object.keys(sheet.data[0]).map(key => ({
          header: key,
          key,
          width: 15,
        }));

        worksheet.columns = columns;
        worksheet.addRows(sheet.data);

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}

export default ExcelExporter;
