import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Analyzes the TRAINED DTR Excel file to extract:
 * 1. Column definitions/meanings from header rows
 * 2. Which columns are relevant (have data)
 * 3. Outputs column metadata
 */

const EXCEL_FILE = path.join(process.cwd(), 'TRAINED DTR_Summary.959740.csv.xlsx');

// Fallback if file not in root
const altPath = path.join(process.cwd(), 'zip_contents', 'TRAINED DTR_Summary.959740.csv.xlsx');
const FILE_PATH = fs.existsSync(EXCEL_FILE) ? EXCEL_FILE : altPath;

function analyzeColumnDefinitions() {
  console.log('Reading Excel file:', FILE_PATH);
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error('Error: Excel file not found. Checked:', EXCEL_FILE);
    console.error('Also checked:', altPath);
    return;
  }

  try {
    // Read the workbook
    const workbook = XLSX.readFile(FILE_PATH);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`\nAnalyzing sheet: "${sheetName}"\n`);
    
    // Convert entire sheet to JSON to see structure
    const allData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,  // Use array format
      defval: '', // Empty cells as empty strings
      raw: false  // Convert numbers to strings for analysis
    });
    
    // Find column definitions (typically in first few rows)
    console.log('=== CHECKING FIRST 10 ROWS FOR COLUMN DEFINITIONS ===\n');
    
    const maxRowsToCheck = Math.min(10, allData.length);
    let columnDefinitions = {};
    
    // Look for definition rows (might be in rows 1-3)
    for (let rowIdx = 0; rowIdx < maxRowsToCheck; rowIdx++) {
      const row = allData[rowIdx] || [];
      
      // Check if this row looks like column definitions
      // (contains descriptions, labels, or explanations)
      const rowText = row.join(' ').toLowerCase();
      
      console.log(`Row ${rowIdx + 1}:`, row.slice(0, 10).join(' | ').substring(0, 150));
      
      // If row contains definition keywords, extract column meanings
      if (rowText.includes('code') || rowText.includes('category') || 
          rowText.includes('type') || rowText.includes('description') ||
          rowIdx === 0 || rowIdx === 1) {
        
        // This might be a definition row
        row.forEach((cell, colIdx) => {
          if (cell && String(cell).trim() && String(cell).length > 0) {
            if (!columnDefinitions[colIdx]) {
              columnDefinitions[colIdx] = [];
            }
            columnDefinitions[colIdx].push(String(cell).trim());
          }
        });
      }
    }
    
    // Find actual data start - based on the output, row 2 has definitions, row 3 has headers, row 4 has data
    // Row 0: Title row
    // Row 1: Definitions row (what each column means)
    // Row 2: Column headers (actual column names)
    // Row 3+: Data rows
    
    const definitionRow = 1; // Row 2 (0-indexed = 1)
    const headerRow = 2;     // Row 3 (0-indexed = 2)
    const dataStartRow = 3;  // Row 4 (0-indexed = 3)
    
    // Extract column definitions (row 2)
    const definitions = allData[definitionRow] || [];
    
    // Extract column headers (row 3)
    const headers = allData[headerRow] || [];
    console.log(`\n=== COLUMN DEFINITIONS (Row ${definitionRow + 1}) ===\n`);
    console.log(`=== COLUMN HEADERS (Row ${headerRow + 1}) ===\n`);
    
    // Analyze data directly from allData array (row 4+)
    console.log('Analyzing data rows...');
    const totalRows = allData.length - dataStartRow;
    const columnStats = {};
    
    // Initialize column stats for each column header
    headers.forEach((header, idx) => {
      if (header && String(header).trim()) {
        const colKey = String(header).trim();
        columnStats[colKey] = {
          index: idx,
          nonEmptyCount: 0,
          emptyCount: 0,
          sampleValues: new Set(),
          definition: definitions[idx] ? String(definitions[idx]).trim() : null
        };
      }
    });
    
    // Analyze data rows (starting from row 4, index 3)
    const rowsToAnalyze = Math.min(1000, allData.length - dataStartRow);
    for (let rowIdx = dataStartRow; rowIdx < dataStartRow + rowsToAnalyze; rowIdx++) {
      const row = allData[rowIdx] || [];
      
      // Check each column
      headers.forEach((header, colIdx) => {
        if (header && String(header).trim()) {
          const colKey = String(header).trim();
          const value = row[colIdx];
          
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            columnStats[colKey].nonEmptyCount++;
            
            // Store sample values
            if (columnStats[colKey].sampleValues.size < 5) {
              columnStats[colKey].sampleValues.add(String(value).trim());
            }
          } else {
            columnStats[colKey].emptyCount++;
          }
        }
      });
    }
    
    // Map column definitions from row 2 to column headers from row 3
    headers.forEach((header, idx) => {
      if (header && header.trim()) {
        const colKey = String(header).trim();
        const definition = definitions[idx];
        
        if (definition && String(definition).trim() && String(definition).trim() !== colKey) {
          columnStats[colKey].definition = String(definition).trim();
        }
      }
    });
    
    // Output results
    console.log(`\n=== COLUMN ANALYSIS (${totalRows} total rows) ===\n`);
    
    const relevantColumns = [];
    const irrelevantColumns = [];
    
    Object.keys(columnStats).sort().forEach(colKey => {
      const stats = columnStats[colKey];
      const fillRate = ((stats.nonEmptyCount / Math.min(totalRows, 1000)) * 100).toFixed(1);
      
      if (stats.nonEmptyCount > 0) {
        relevantColumns.push({
          column: colKey,
          definition: stats.definition || 'No definition found',
          filledRows: stats.nonEmptyCount,
          fillRate: `${fillRate}%`,
          sampleValues: Array.from(stats.sampleValues).slice(0, 3)
        });
      } else {
        irrelevantColumns.push(colKey);
      }
    });
    
    console.log(`✅ RELEVANT COLUMNS (${relevantColumns.length}):\n`);
    relevantColumns.forEach(col => {
      console.log(`📋 ${col.column}`);
      if (col.definition && col.definition !== col.column) {
        console.log(`   Meaning: ${col.definition}`);
      }
      console.log(`   Fill Rate: ${col.fillRate} (${col.filledRows} rows with data)`);
      if (col.sampleValues.length > 0) {
        console.log(`   Sample values: ${col.sampleValues.join(', ')}`);
      }
      console.log('');
    });
    
    if (irrelevantColumns.length > 0) {
      console.log(`\n❌ IRRELEVANT COLUMNS (${irrelevantColumns.length} - all blank):\n`);
      irrelevantColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
    }
    
    // Save results to JSON file
    const results = {
      file: 'TRAINED DTR_Summary.959740.csv.xlsx',
      totalRows,
      analyzedRows: Math.min(totalRows, 1000),
      relevantColumns: relevantColumns.map(col => ({
        column: col.column,
        definition: col.definition,
        fillRate: col.fillRate,
        filledRows: col.filledRows,
        sampleValues: col.sampleValues
      })),
      irrelevantColumns
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'column_definitions.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log(`\n✅ Results saved to column_definitions.json`);
    
  } catch (error) {
    console.error('Error analyzing file:', error);
  }
}

analyzeColumnDefinitions();

