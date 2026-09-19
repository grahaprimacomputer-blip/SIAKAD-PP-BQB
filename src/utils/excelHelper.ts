/**
 * Helper to copy tabular data to clipboard in Excel-ready format (TSV).
 * When pasted into Excel or Google Sheets, this preserves rows and columns cleanly.
 */
export const copyTableToExcelClipboard = async (
  headers: string[],
  rows: (string | number | undefined | null)[][]
): Promise<boolean> => {
  try {
    const cleanRows = rows.map(row => 
      row.map(cell => {
        if (cell === undefined || cell === null) return '';
        const str = String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ');
        return str;
      }).join('\t')
    );
    const content = [headers.join('\t'), ...cleanRows].join('\n');
    
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.warn('Clipboard write error:', err);
    // Fallback using textarea element
    try {
      const cleanRows = rows.map(row => 
        row.map(cell => String(cell || '').replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')
      );
      const content = [headers.join('\t'), ...cleanRows].join('\n');
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Helper to download CSV file
 */
export const downloadCSV = (
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): void => {
  const processRow = (row: (string | number | undefined | null)[]) => {
    return row.map(val => {
      let str = val === undefined || val === null ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
  };

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(processRow)].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse pasted text from Excel or Sheets (TSV or CSV)
 */
export const parseExcelPastedText = (rawText: string): string[][] => {
  if (!rawText.trim()) return [];
  const lines = rawText.trim().split(/\r?\n/);
  return lines.map(line => {
    // If contains tabs, it's copied from Excel
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim());
    }
    // Else check comma separated
    return line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
  }).filter(row => row.length > 0 && row.some(c => c !== ''));
};
