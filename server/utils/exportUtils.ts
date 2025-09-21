import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import type { InventoryReport, StockMovementReport, CategoryReport } from '@shared/schema';

export class ReportExporter {
  
  /**
   * Export inventory report to Excel
   */
  async exportInventoryToExcel(data: InventoryReport[], title: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lagerbestand');

    // Set header
    worksheet.columns = [
      { header: 'Artikel-Nr.', key: 'articleNumber', width: 15 },
      { header: 'Artikel-Name', key: 'articleName', width: 30 },
      { header: 'Kategorie', key: 'categoryName', width: 15 },
      { header: 'Sub-Kategorie', key: 'subCategoryName', width: 15 },
      { header: 'Aktueller Bestand', key: 'currentStock', width: 15 },
      { header: 'Mindestbestand', key: 'minimumStock', width: 15 },
      { header: 'Preis/Einheit', key: 'unitPrice', width: 12 },
      { header: 'Gesamtwert', key: 'totalValue', width: 12 },
      { header: 'Lagerplatz', key: 'location', width: 15 },
      { header: 'Niedrigbestand?', key: 'isLowStock', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.forEach(item => {
      worksheet.addRow({
        articleNumber: item.articleNumber,
        articleName: item.articleName,
        categoryName: item.categoryName,
        subCategoryName: item.subCategoryName || '-',
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        unitPrice: item.unitPrice ? `€${item.unitPrice}` : '-',
        totalValue: item.totalValue ? `€${item.totalValue}` : '-',
        location: item.location || '-',
        isLowStock: item.isLowStock ? 'Ja' : 'Nein',
      });
    });

    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `J${worksheet.lastRow?.number || 1}`
    };

    // Highlight low stock items
    data.forEach((item, index) => {
      if (item.isLowStock) {
        const row = worksheet.getRow(index + 2);
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD0D0' }
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export stock movements to Excel
   */
  async exportStockMovementsToExcel(data: StockMovementReport[], title: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lagerbewegungen');

    // Set columns
    worksheet.columns = [
      { header: 'Datum', key: 'createdAt', width: 15 },
      { header: 'Artikel-Nr.', key: 'articleNumber', width: 15 },
      { header: 'Artikel-Name', key: 'articleName', width: 30 },
      { header: 'Bewegungstyp', key: 'type', width: 15 },
      { header: 'Menge', key: 'quantity', width: 10 },
      { header: 'Kostenstelle', key: 'costCenter', width: 20 },
      { header: 'Benutzer', key: 'user', width: 20 },
      { header: 'Notizen', key: 'notes', width: 30 },
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.forEach(item => {
      const typeMap = {
        'checkin': 'Einlagerung',
        'checkout': 'Entnahme',
        'adjustment': 'Korrektur',
        'transfer': 'Transfer'
      };

      worksheet.addRow({
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('de-DE') : '-',
        articleNumber: item.article.articleNumber,
        articleName: item.article.name,
        type: typeMap[item.type] || item.type,
        quantity: item.type === 'checkout' ? -item.quantity : item.quantity,
        costCenter: item.costCenter?.name || '-',
        user: `${item.user.firstName} ${item.user.lastName}`,
        notes: item.notes || '-',
      });
    });

    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: `H${worksheet.lastRow?.number || 1}`
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export category report to Excel
   */
  async exportCategoryToExcel(data: CategoryReport[], title: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Kategorie-Übersicht');

    // Set columns
    worksheet.columns = [
      { header: 'Kategorie-Code', key: 'categoryCode', width: 15 },
      { header: 'Kategorie-Name', key: 'categoryName', width: 25 },
      { header: 'Artikel Anzahl', key: 'totalArticles', width: 15 },
      { header: 'Gesamtbestand', key: 'totalStock', width: 15 },
      { header: 'Gesamtwert', key: 'totalValue', width: 15 },
      { header: 'Niedrigbestand Artikel', key: 'lowStockArticles', width: 20 },
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.forEach(item => {
      worksheet.addRow({
        categoryCode: item.categoryCode,
        categoryName: item.categoryName,
        totalArticles: item.totalArticles,
        totalStock: item.totalStock,
        totalValue: `€${parseFloat(item.totalValue).toFixed(2)}`,
        lowStockArticles: item.lowStockArticles,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate HTML content for PDF reports
   */
  private generateHTML(title: string, data: any[], type: 'inventory' | 'movements' | 'categories'): string {
    let tableHTML = '';

    if (type === 'inventory') {
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Artikel-Nr.</th>
              <th>Artikel-Name</th>
              <th>Kategorie</th>
              <th>Aktueller Bestand</th>
              <th>Mindestbestand</th>
              <th>Preis/Einheit</th>
              <th>Gesamtwert</th>
              <th>Niedrigbestand?</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: InventoryReport) => `
              <tr ${item.isLowStock ? 'class="low-stock"' : ''}>
                <td>${item.articleNumber}</td>
                <td>${item.articleName}</td>
                <td>${item.categoryName}</td>
                <td>${item.currentStock}</td>
                <td>${item.minimumStock}</td>
                <td>${item.unitPrice ? `€${item.unitPrice}` : '-'}</td>
                <td>${item.totalValue ? `€${item.totalValue}` : '-'}</td>
                <td>${item.isLowStock ? 'Ja' : 'Nein'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'movements') {
      const typeMap = {
        'checkin': 'Einlagerung',
        'checkout': 'Entnahme',
        'adjustment': 'Korrektur',
        'transfer': 'Transfer'
      };

      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Artikel-Nr.</th>
              <th>Artikel-Name</th>
              <th>Bewegungstyp</th>
              <th>Menge</th>
              <th>Kostenstelle</th>
              <th>Benutzer</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: StockMovementReport) => `
              <tr>
                <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString('de-DE') : '-'}</td>
                <td>${item.article.articleNumber}</td>
                <td>${item.article.name}</td>
                <td>${typeMap[item.type] || item.type}</td>
                <td ${item.type === 'checkout' ? 'class="checkout"' : ''}>${item.type === 'checkout' ? '-' : ''}${item.quantity}</td>
                <td>${item.costCenter?.name || '-'}</td>
                <td>${item.user.firstName} ${item.user.lastName}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'categories') {
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Kategorie-Code</th>
              <th>Kategorie-Name</th>
              <th>Artikel Anzahl</th>
              <th>Gesamtbestand</th>
              <th>Gesamtwert</th>
              <th>Niedrigbestand Artikel</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: CategoryReport) => `
              <tr>
                <td>${item.categoryCode}</td>
                <td>${item.categoryName}</td>
                <td>${item.totalArticles}</td>
                <td>${item.totalStock}</td>
                <td>€${parseFloat(item.totalValue).toFixed(2)}</td>
                <td>${item.lowStockArticles}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .low-stock {
            background-color: #ffe6e6;
          }
          .checkout {
            color: #e74c3c;
            font-weight: bold;
          }
          .report-footer {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
        ${tableHTML}
        <div class="report-footer">
          LagerVerwaltung Pro - Automatisch generierter Bericht
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Export report to PDF - Simplified version that doesn't require Puppeteer
   */
  async exportToPDF(title: string, data: any[], type: 'inventory' | 'movements' | 'categories'): Promise<Buffer> {
    // For now, we'll generate a simple HTML file that can be converted to PDF by the browser
    // This avoids the Puppeteer dependency issues in the Replit environment
    const html = this.generatePrintableHTML(title, data, type);
    
    // Return HTML as Buffer - the browser can handle the PDF conversion
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generate a print-optimized HTML that browsers can convert to PDF
   */
  private generatePrintableHTML(title: string, data: any[], type: 'inventory' | 'movements' | 'categories'): string {
    let tableHTML = '';

    if (type === 'inventory') {
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Artikel-Nr.</th>
              <th>Artikel-Name</th>
              <th>Kategorie</th>
              <th>Aktueller Bestand</th>
              <th>Mindestbestand</th>
              <th>Preis/Einheit</th>
              <th>Gesamtwert</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any) => `
              <tr ${item.isLowStock ? 'class="low-stock"' : ''}>
                <td>${item.articleNumber}</td>
                <td>${item.articleName}</td>
                <td>${item.categoryName}</td>
                <td>${item.currentStock}</td>
                <td>${item.minimumStock}</td>
                <td>${item.unitPrice ? `€${item.unitPrice}` : '-'}</td>
                <td>${item.totalValue ? `€${item.totalValue}` : '-'}</td>
                <td>${item.isLowStock ? 'Niedrigbestand' : 'Normal'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'movements') {
      const typeMap = {
        'checkin': 'Einlagerung',
        'checkout': 'Entnahme',
        'adjustment': 'Korrektur',
        'transfer': 'Transfer'
      };

      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Artikel-Nr.</th>
              <th>Artikel-Name</th>
              <th>Bewegungstyp</th>
              <th>Menge</th>
              <th>Kostenstelle</th>
              <th>Benutzer</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any) => `
              <tr>
                <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString('de-DE') : '-'}</td>
                <td>${item.article.articleNumber}</td>
                <td>${item.article.name}</td>
                <td>${typeMap[item.type as keyof typeof typeMap] || item.type}</td>
                <td class="${item.type === 'checkout' ? 'checkout' : ''}">${item.type === 'checkout' ? '-' : ''}${item.quantity}</td>
                <td>${item.costCenter?.name || '-'}</td>
                <td>${item.user.firstName} ${item.user.lastName}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (type === 'categories') {
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Kategorie-Code</th>
              <th>Kategorie-Name</th>
              <th>Artikel Anzahl</th>
              <th>Gesamtbestand</th>
              <th>Gesamtwert</th>
              <th>Niedrigbestand Artikel</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item: any) => `
              <tr>
                <td>${item.categoryCode}</td>
                <td>${item.categoryName}</td>
                <td>${item.totalArticles}</td>
                <td>${item.totalStock}</td>
                <td>€${parseFloat(item.totalValue).toFixed(2)}</td>
                <td>${item.lowStockArticles}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            font-size: 12px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            font-size: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            page-break-inside: auto;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            font-size: 10px;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .low-stock {
            background-color: #ffe6e6;
          }
          .checkout {
            color: #e74c3c;
            font-weight: bold;
          }
          .report-footer {
            margin-top: 30px;
            font-size: 10px;
            color: #666;
            text-align: center;
            page-break-inside: avoid;
          }
          @page {
            margin: 2cm;
          }
          tr {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p><strong>Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
        ${tableHTML}
        <div class="report-footer">
          LagerVerwaltung Pro - Automatisch generierter Bericht
        </div>
      </body>
      </html>
    `;
  }
}

export const reportExporter = new ReportExporter();