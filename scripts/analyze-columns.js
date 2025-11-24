import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Excel file
const excelFilePath = path.join(__dirname, '..', 'zip_contents', 'TRAINED DTR_Summary.959740.csv.xlsx');

if (!fs.existsSync(excelFilePath)) {
  console.error('❌ Excel file not found at:', excelFilePath);
  console.log('Please make sure the file is extracted in the zip_contents folder.');
  process.exit(1);
}

console.log('📊 Analyzing Excel file:', path.basename(excelFilePath));
console.log('=' .repeat(60));

try {
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON to see the structure
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  console.log(`\n📄 Sheet: ${sheetName}`);
  console.log(`📊 Total rows: ${jsonData.length}`);
  
  // Look for header rows that explain column meanings
  // Typically, Excel files have descriptive headers in the first few rows
  let headerRowIndex = -1;
  let dataStartRow = -1;
  let columnDescriptions = {};
  let columnNames = [];
  
  // Check first 10 rows for header information
  console.log('\n🔍 Analyzing header structure...');
  console.log('-' .repeat(60));
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    
    if (nonEmptyCells.length > 0) {
      console.log(`Row ${i + 1}: ${JSON.stringify(row.slice(0, Math.min(10, row.length)))}`);
      
      // Look for patterns that indicate header rows
      // Check if this row contains descriptive text that might explain columns
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      
      // Check if row contains words like "code", "description", "category", "type"
      if (rowText.includes('code') || rowText.includes('description') || 
          rowText.includes('category') || rowText.includes('type') ||
          rowText.includes('meaning') || rowText.includes('definition')) {
        console.log(`  ⭐ Potential header row found at row ${i + 1}`);
        if (headerRowIndex === -1) {
          headerRowIndex = i;
        }
      }
      
      // Check if this looks like actual data (numbers, dates, etc.)
      if (dataStartRow === -1 && i > 0) {
        const hasData = row.some(cell => {
          if (!cell) return false;
          const str = String(cell);
          return /^\d+/.test(str) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str); // Numbers or dates
        });
        if (hasData && headerRowIndex >= 0) {
          dataStartRow = i;
        }
      }
    }
  }
  
  // Try to identify column headers and their meanings
  console.log('\n📋 Column Analysis:');
  console.log('=' .repeat(60));
  
  // Get all unique column headers from first few rows
  const allHeaders = new Set();
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    jsonData[i].forEach((cell, colIndex) => {
      if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
        allHeaders.add(`Row${i+1}_Col${colIndex + 1}`);
      }
    });
  }
  
  // Analyze each column
  const maxColumns = Math.max(...jsonData.map(row => row.length));
  console.log(`\nTotal columns detected: ${maxColumns}\n`);
  
  const columnInfo = [];
  
  for (let col = 0; col < maxColumns; col++) {
    const columnData = [];
    let headerFound = false;
    let descriptionFound = false;
    let columnHeader = '';
    let columnDescription = '';
    let nonEmptyCount = 0;
    let emptyCount = 0;
    
    // Check first 10 rows for headers/descriptions
    for (let row = 0; row < Math.min(10, jsonData.length); row++) {
      const cell = jsonData[row] && jsonData[row][col];
      
      if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
        const cellValue = String(cell).trim();
        
        if (!headerFound && cellValue.length < 50) {
          // Likely a header
          columnHeader = cellValue;
          headerFound = true;
        } else if (headerFound && !descriptionFound && (cellValue.includes(' ') || cellValue.length > 3)) {
          // Might be a description
          if (!cellValue.match(/^\d+$/)) { // Not just a number
            columnDescription = cellValue;
            descriptionFound = true;
          }
        }
      }
    }
    
    // Count empty vs non-empty cells in data rows (skip first 3 rows for headers)
    const dataRows = jsonData.slice(3);
    dataRows.forEach(row => {
      const cell = row && row[col];
      if (cell === null || cell === undefined || String(cell).trim() === '') {
        emptyCount++;
      } else {
        nonEmptyCount++;
      }
    });
    
    const totalRows = emptyCount + nonEmptyCount;
    const fillPercentage = totalRows > 0 ? (nonEmptyCount / totalRows * 100).toFixed(1) : 0;
    
    // Determine if column is relevant
    const isRelevant = nonEmptyCount > 0;
    const relevance = isRelevant ? '✅ RELEVANT' : '❌ IRRELEVANT (Blank)';
    
    columnInfo.push({
      column: col + 1,
      header: columnHeader || `Column ${col + 1}`,
      description: columnDescription || 'No description found',
      nonEmpty: nonEmptyCount,
      empty: emptyCount,
      fillPercentage: fillPercentage,
      relevant: isRelevant
    });
  }
  
  // Output results
  console.log('Column | Header | Description | Non-Empty | Empty | Fill % | Status');
  console.log('-'.repeat(100));
  
  columnInfo.forEach(info => {
    const status = info.relevant ? '✅ RELEVANT' : '❌ IRRELEVANT';
    const header = (info.header || 'N/A').padEnd(20);
    const desc = (info.description || 'No description').padEnd(30);
    console.log(
      `  ${String(info.column).padStart(2)}  | ${header} | ${desc} | ${String(info.nonEmpty).padStart(5)} | ${String(info.empty).padStart(5)} | ${info.fillPercentage.padStart(5)}% | ${status}`
    );
  });
  
  // Summary
  const relevantColumns = columnInfo.filter(c => c.relevant);
  const irrelevantColumns = columnInfo.filter(c => !c.relevant);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`✅ Relevant columns: ${relevantColumns.length}`);
  console.log(`❌ Irrelevant/Blank columns: ${irrelevantColumns.length}`);
  console.log(`📋 Total columns: ${columnInfo.length}`);
  
  // Export to JSON for use in the application
  const output = {
    fileName: path.basename(excelFilePath),
    sheetName: sheetName,
    totalRows: jsonData.length,
    columns: columnInfo,
    relevantColumns: relevantColumns.map(c => ({
      column: c.column,
      header: c.header,
      description: c.description,
      fillPercentage: c.fillPercentage
    })),
    irrelevantColumns: irrelevantColumns.map(c => ({
      column: c.column,
      header: c.header
    }))
  };
  
  // Save analysis to JSON file
  const outputPath = path.join(__dirname, '..', 'column-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Analysis saved to: ${outputPath}`);
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  process.exit(1);
}

