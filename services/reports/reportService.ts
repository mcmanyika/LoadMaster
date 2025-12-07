import { CalculatedLoad } from '../../types';
import { ReportFilters } from '../../types/reports';

/**
 * Filter loads by date range
 */
export const filterLoadsByDate = (
  loads: CalculatedLoad[],
  startDate?: string,
  endDate?: string
): CalculatedLoad[] => {
  if (!startDate && !endDate) {
    return loads;
  }

  return loads.filter(load => {
    const loadDate = new Date(load.dropDate);
    
    if (startDate && loadDate < new Date(startDate)) {
      return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      if (loadDate > end) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Export data to CSV format
 * Returns { success: boolean, error?: string }
 */
export const exportToCSV = (data: any[], filename: string): { success: boolean; error?: string } => {
  if (data.length === 0) {
    return { success: false, error: 'No data to export' };
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers
    headers.map(h => `"${h}"`).join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }
        // Handle objects/arrays
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Handle strings with quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
  return { success: true };
};

/**
 * Export expenses to PDF using browser print functionality
 * Returns { success: boolean, error?: string }
 */
export const exportExpensesToPDF = (expenses: any[], filename: string): { success: boolean; error?: string } => {
  if (expenses.length === 0) {
    return { success: false, error: 'No data to export' };
  }

  // Create a printable table
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return { success: false, error: 'Please allow popups to export PDF' };
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Expense Report - ${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e293b; margin-bottom: 10px; }
          .meta { color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .total-row { font-weight: bold; background-color: #e0e7ff; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>Expense Report</h1>
        <div class="meta">
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Total Expenses: ${expenses.length} | Total Amount: $${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(exp => `
              <tr>
                <td>${new Date(exp.expenseDate).toLocaleDateString()}</td>
                <td>${exp.category?.name || 'N/A'}</td>
                <td>${exp.description || 'N/A'}</td>
                <td>${exp.vendor || 'N/A'}</td>
                <td>$${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${exp.vehicleName || 'N/A'}</td>
                <td>${exp.driverName || 'N/A'}</td>
                <td>${exp.paymentMethod ? exp.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</td>
                <td>${exp.paymentStatus ? exp.paymentStatus.charAt(0).toUpperCase() + exp.paymentStatus.slice(1) : 'N/A'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4"><strong>Total</strong></td>
              <td><strong>$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
              <td colspan="4"></td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
  return { success: true };
};

/**
 * Export data to PDF using browser print functionality
 * For a more advanced PDF, consider using a library like jsPDF
 * Returns { success: boolean, error?: string }
 */
export const exportToPDF = (data: any[], type: 'driver' | 'dispatcher', filename: string): { success: boolean; error?: string } => {
  if (data.length === 0) {
    return { success: false, error: 'No data to export' };
  }

  // Create a printable table
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return { success: false, error: 'Please allow popups to export PDF' };
  }

  const reportType = type === 'driver' ? 'Driver' : 'Dispatcher';
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportType} Report - ${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e293b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>${reportType} Performance Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${generateHTMLTable(data, type)}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    // Optionally close after printing
    // printWindow.close();
  }, 250);
  return { success: true };
};

/**
 * Generate HTML table from report data
 */
const generateHTMLTable = (data: any[], type: 'driver' | 'dispatcher'): string => {
  if (type === 'driver') {
    return `
      <table>
        <thead>
          <tr>
            <th>Driver Name</th>
            <th>Total Loads</th>
            <th>Total Pay</th>
            <th>Total Miles</th>
            <th>Avg Rate/Mile</th>
            <th>Factored</th>
            <th>Not Factored</th>
            <th>Pending</th>
            <th>Paid</th>
            <th>Partial</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.driverName}</td>
              <td>${row.totalLoads}</td>
              <td>$${row.totalPay.toFixed(2)}</td>
              <td>${row.totalMiles.toLocaleString()}</td>
              <td>$${row.avgRatePerMile.toFixed(2)}</td>
              <td>${row.loadsByStatus.factored}</td>
              <td>${row.loadsByStatus.notFactored}</td>
              <td>${row.payoutStatus.pending}</td>
              <td>${row.payoutStatus.paid}</td>
              <td>${row.payoutStatus.partial}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    return `
      <table>
        <thead>
          <tr>
            <th>Dispatcher Name</th>
            <th>Total Loads</th>
            <th>Total Fees</th>
            <th>Avg Fee/Load</th>
            <th>Factored</th>
            <th>Not Factored</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.dispatcherName}</td>
              <td>${row.totalLoads}</td>
              <td>$${row.totalFees.toFixed(2)}</td>
              <td>$${row.avgFeePerLoad.toFixed(2)}</td>
              <td>${row.loadsByStatus.factored}</td>
              <td>${row.loadsByStatus.notFactored}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
};

/**
 * Export AI analysis report to PDF
 * Returns { success: boolean, error?: string }
 */
export const exportAIAnalysisToPDF = (analysis: string, filename: string = 'ai-analysis'): { success: boolean; error?: string } => {
  if (!analysis || analysis.trim() === '') {
    return { success: false, error: 'No analysis to export' };
  }

  // Create a printable document
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return { success: false, error: 'Please allow popups to export PDF' };
  }

  // Convert markdown-like formatting to HTML
  const formattedAnalysis = analysis
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(\d+\.\s)/gm, '<strong>$1</strong>');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AI Analysis Report - ${filename}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            line-height: 1.6;
            color: #1e293b;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { 
            color: #1e293b; 
            margin-bottom: 10px;
            font-size: 24px;
          }
          .meta {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
          }
          .content {
            font-size: 14px;
            line-height: 1.8;
          }
          .content p {
            margin-bottom: 16px;
          }
          .content strong {
            color: #1e293b;
            font-weight: 600;
          }
          @media print {
            body { margin: 0; padding: 20px; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <h1>AI Analysis Report</h1>
        <div class="meta">
          Generated: ${new Date().toLocaleString()}
        </div>
        <div class="content">
          <p>${formattedAnalysis}</p>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
  return { success: true };
};

