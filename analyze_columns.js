import XLSX from 'xlsx';
import fs from 'fs';

const filePath = './TRAINED DTR_Summary.959740.csv.xlsx';

console.log('Reading Excel file:', filePath);
console.log('='.repeat(80));

try {
  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log(`Sheet Name: ${sheetName}`);
  console.log(`Total Sheets: ${workbook.SheetNames.length}`);
  console.log('='.repeat(80));
  
  // Convert to JSON to see the structure
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null, 
    raw: false 
  });
  
  console.log(`Total Rows: ${jsonData.length}`);
  console.log('='.repeat(80));
  
  // Look at the first few rows to identify column headers and descriptions
  const firstRows = jsonData.slice(0, 10);
  
  console.log('\n=== FIRST 10 ROWS (to identify column structure) ===\n');
  
  // Find which row contains the actual column headers
  let headerRowIndex = 0;
  let columnHeaders = [];
  let columnDescriptions = {};
  
  // Check first few rows for potential header information
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`Row ${i + 1}:`, row);
    
    // Check if this row looks like headers (has text values)
    const textCount = row.filter(cell => cell && typeof cell === 'string' && cell.trim().length > 0).length;
    if (textCount > 5 && i === headerRowIndex) {
      // This might be the header row
      columnHeaders = row.map((cell, idx) => ({
        index: idx,
        name: cell ? String(cell).trim() : `Column_${idx + 1}`,
        letter: XLSX.utils.encode_col(idx)
      }));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n=== COLUMN ANALYSIS ===\n');
  
  // Use first row as headers if not found
  if (columnHeaders.length === 0 && jsonData.length > 0) {
    columnHeaders = jsonData[0].map((cell, idx) => ({
      index: idx,
      name: cell ? String(cell).trim() : `Column_${idx + 1}`,
      letter: XLSX.utils.encode_col(idx)
    }));
  }
  
  // Convert with proper headers
  const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false
  });
  
  console.log(`Total Columns: ${columnHeaders.length}`);
  console.log(`Total Data Rows: ${dataWithHeaders.length}`);
  console.log('\n');
  
  // Analyze each column
  const columnAnalysis = [];
  
  columnHeaders.forEach((header, idx) => {
    if (!header.name || header.name.startsWith('Column_')) {
      return; // Skip empty or generic headers
    }
    
    const columnName = header.name;
    const columnValues = dataWithHeaders
      .map(row => row[columnName])
      .filter(val => val !== null && val !== undefined && val !== '');
    
    const totalRows = dataWithHeaders.length;
    const nonEmptyCount = columnValues.length;
    const emptyCount = totalRows - nonEmptyCount;
    const isEmpty = nonEmptyCount === 0;
    
    // Get sample values
    const sampleValues = columnValues.slice(0, 5);
    const uniqueValues = [...new Set(columnValues)].slice(0, 10);
    
    columnAnalysis.push({
      name: columnName,
      index: idx,
      letter: header.letter,
      totalRows: totalRows,
      nonEmptyCount: nonEmptyCount,
      emptyCount: emptyCount,
      isEmpty: isEmpty,
      isEmptyPercent: ((emptyCount / totalRows) * 100).toFixed(2),
      sampleValues: sampleValues,
      uniqueCount: uniqueValues.length,
      uniqueValues: uniqueValues.slice(0, 5)
    });
  });
  
  // Group by relevance
  const relevantColumns = columnAnalysis.filter(col => !col.isEmpty);
  const irrelevantColumns = columnAnalysis.filter(col => col.isEmpty);
  
  console.log('=== RELEVANT COLUMNS (Have Data) ===\n');
  relevantColumns.forEach((col, idx) => {
    console.log(`${idx + 1}. [${col.letter}] ${col.name}`);
    console.log(`   - Non-empty rows: ${col.nonEmptyCount}/${col.totalRows} (${(100 - parseFloat(col.isEmptyPercent)).toFixed(2)}%)`);
    console.log(`   - Unique values: ${col.uniqueCount}`);
    if (col.sampleValues.length > 0) {
      console.log(`   - Sample values: ${col.sampleValues.map(v => String(v).substring(0, 50)).join(', ')}`);
    }
    console.log('');
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n=== IRRELEVANT COLUMNS (All Blank/Empty) ===\n');
  if (irrelevantColumns.length > 0) {
    irrelevantColumns.forEach((col, idx) => {
      console.log(`${idx + 1}. [${col.letter}] ${col.name} - 100% empty`);
    });
  } else {
    console.log('None - All columns have data!');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n=== SUMMARY ===\n');
  console.log(`Total Columns: ${columnAnalysis.length}`);
  console.log(`Relevant Columns (with data): ${relevantColumns.length}`);
  console.log(`Irrelevant Columns (all blank): ${irrelevantColumns.length}`);
  
  // Save analysis to JSON file
  const analysisResult = {
    fileName: 'TRAINED DTR_Summary.959740.csv.xlsx',
    sheetName: sheetName,
    totalRows: dataWithHeaders.length,
    totalColumns: columnAnalysis.length,
    relevantColumns: relevantColumns,
    irrelevantColumns: irrelevantColumns,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('column_analysis.json', JSON.stringify(analysisResult, null, 2));
  console.log('\n✓ Analysis saved to: column_analysis.json');
  
  // Generate markdown documentation
  let markdown = `# Column Analysis: TRAINED DTR_Summary.959740.csv.xlsx\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `- **Total Rows**: ${dataWithHeaders.length}\n`;
  markdown += `- **Total Columns**: ${columnAnalysis.length}\n`;
  markdown += `- **Relevant Columns**: ${relevantColumns.length}\n`;
  markdown += `- **Irrelevant Columns**: ${irrelevantColumns.length}\n\n`;
  
  markdown += `## Relevant Columns (${relevantColumns.length})\n\n`;
  relevantColumns.forEach((col, idx) => {
    markdown += `### ${idx + 1}. ${col.name} [Column ${col.letter}]\n\n`;
    markdown += `- **Status**: ✅ Has Data\n`;
    markdown += `- **Non-empty rows**: ${col.nonEmptyCount}/${col.totalRows} (${(100 - parseFloat(col.isEmptyPercent)).toFixed(2)}%)\n`;
    markdown += `- **Unique values**: ${col.uniqueCount}\n`;
    if (col.sampleValues.length > 0) {
      markdown += `- **Sample values**: ${col.sampleValues.map(v => `"${String(v).substring(0, 100)}"`).join(', ')}\n`;
    }
    markdown += `\n`;
  });
  
  if (irrelevantColumns.length > 0) {
    markdown += `## Irrelevant Columns (${irrelevantColumns.length}) - All Blank\n\n`;
    markdown += `These columns contain no data and can be ignored:\n\n`;
    irrelevantColumns.forEach((col, idx) => {
      markdown += `${idx + 1}. **${col.name}** [Column ${col.letter}] - 100% empty\n`;
    });
  }
  
  fs.writeFileSync('COLUMN_ANALYSIS.md', markdown);
  console.log('✓ Documentation saved to: COLUMN_ANALYSIS.md');
  
} catch (error) {
  console.error('Error reading file:', error);
  process.exit(1);
}
