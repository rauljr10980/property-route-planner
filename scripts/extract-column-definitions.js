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

console.log('📊 Extracting Column Definitions from Excel file...');
console.log('=' .repeat(80));

try {
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON to see the structure
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  console.log(`\n📄 Sheet: ${sheetName}`);
  console.log(`📊 Total rows: ${jsonData.length}\n`);
  
  // Row 2 contains the descriptions (based on analysis)
  const descriptionRow = jsonData[1] || []; // Row 2 (index 1)
  const headerRow = jsonData[2] || []; // Row 3 (index 2) - actual column headers
  
  const maxColumns = Math.max(
    descriptionRow.length,
    headerRow.length,
    ...jsonData.map(row => row ? row.length : 0)
  );
  
  console.log(`📋 Total columns detected: ${maxColumns}\n`);
  
  // Analyze each column
  const columns = [];
  const dataRows = jsonData.slice(3); // Data starts at row 4 (index 3)
  
  for (let col = 0; col < maxColumns; col++) {
    const header = headerRow[col] ? String(headerRow[col]).trim() : `Column_${col + 1}`;
    const description = descriptionRow[col] ? String(descriptionRow[col]).trim() : '';
    
    // Count empty vs non-empty cells in data rows
    let nonEmptyCount = 0;
    let emptyCount = 0;
    
    dataRows.forEach(row => {
      const cell = row && row[col];
      if (cell === null || cell === undefined || String(cell).trim() === '') {
        emptyCount++;
      } else {
        nonEmptyCount++;
      }
    });
    
    const totalRows = emptyCount + nonEmptyCount;
    const fillPercentage = totalRows > 0 ? (nonEmptyCount / totalRows * 100).toFixed(1) : '0.0';
    const isRelevant = nonEmptyCount > 0;
    
    // Get a sample value from the data
    let sampleValue = null;
    for (const row of dataRows.slice(0, 5)) {
      if (row && row[col] !== null && row[col] !== undefined && String(row[col]).trim() !== '') {
        sampleValue = String(row[col]).trim();
        if (sampleValue.length > 50) {
          sampleValue = sampleValue.substring(0, 50) + '...';
        }
        break;
      }
    }
    
    columns.push({
      columnNumber: col + 1,
      header: header,
      description: description || 'No description provided',
      sampleValue: sampleValue,
      nonEmptyRows: nonEmptyCount,
      emptyRows: emptyCount,
      totalRows: totalRows,
      fillPercentage: parseFloat(fillPercentage),
      isRelevant: isRelevant,
      isBlank: !isRelevant
    });
  }
  
  // Separate relevant and irrelevant columns
  const relevantColumns = columns.filter(c => c.isRelevant);
  const irrelevantColumns = columns.filter(c => !c.isRelevant);
  
  // Output results
  console.log('📋 COLUMN DEFINITIONS:');
  console.log('=' .repeat(80));
  console.log('\n✅ RELEVANT COLUMNS (with data):\n');
  
  relevantColumns.forEach(col => {
    const status = col.isRelevant ? '✅' : '❌';
    const blank = col.fillPercentage === 0 ? ' (BLANK - IRRELEVANT)' : '';
    console.log(`${status} Column ${String(col.columnNumber).padStart(2)}: ${col.header}`);
    if (col.description && col.description !== 'No description provided') {
      console.log(`   📝 Description: ${col.description}`);
    }
    if (col.sampleValue) {
      console.log(`   📄 Sample: ${col.sampleValue}`);
    }
    console.log(`   📊 Fill: ${col.fillPercentage}% (${col.nonEmptyRows} non-empty, ${col.emptyRows} empty)`);
    if (blank) console.log(`   ⚠️  ${blank}`);
    console.log('');
  });
  
  console.log('\n' + '=' .repeat(80));
  console.log('❌ IRRELEVANT COLUMNS (completely blank):\n');
  
  if (irrelevantColumns.length === 0) {
    console.log('   None - all columns contain some data!');
  } else {
    irrelevantColumns.forEach(col => {
      console.log(`❌ Column ${String(col.columnNumber).padStart(2)}: ${col.header}`);
      if (col.description && col.description !== 'No description provided') {
        console.log(`   📝 Description: ${col.description}`);
      }
      console.log(`   ⚠️  Status: BLANK - No data found in any row`);
      console.log('');
    });
  }
  
  // Summary
  console.log('=' .repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Relevant columns: ${relevantColumns.length}`);
  console.log(`   ❌ Irrelevant/Blank columns: ${irrelevantColumns.length}`);
  console.log(`   📋 Total columns: ${columns.length}`);
  console.log(`   📄 Total data rows: ${dataRows.length}`);
  
  // Create detailed output for application use
  const output = {
    fileName: path.basename(excelFilePath),
    sheetName: sheetName,
    totalRows: jsonData.length,
    dataRows: dataRows.length,
    totalColumns: columns.length,
    relevantColumns: relevantColumns.length,
    irrelevantColumns: irrelevantColumns.length,
    columns: columns,
    columnDefinitions: columns.reduce((acc, col) => {
      if (col.description && col.description !== 'No description provided') {
        acc[col.header] = {
          description: col.description,
          isRelevant: col.isRelevant,
          fillPercentage: col.fillPercentage,
          sampleValue: col.sampleValue
        };
      }
      return acc;
    }, {})
  };
  
  // Save to JSON file
  const outputPath = path.join(__dirname, '..', 'column-definitions.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Column definitions saved to: ${outputPath}`);
  
  // Also create a human-readable summary file
  const summaryPath = path.join(__dirname, '..', 'COLUMN_DEFINITIONS.md');
  let summary = `# Column Definitions - TRAINED DTR_Summary.959740.csv.xlsx\n\n`;
  summary += `**Total Columns:** ${columns.length} | **Relevant:** ${relevantColumns.length} | **Irrelevant/Blank:** ${irrelevantColumns.length}\n\n`;
  summary += `---\n\n## ✅ Relevant Columns\n\n`;
  
  relevantColumns.forEach(col => {
    summary += `### Column ${col.columnNumber}: ${col.header}\n\n`;
    if (col.description && col.description !== 'No description provided') {
      summary += `**Description:** ${col.description}\n\n`;
    }
    summary += `- Fill Percentage: ${col.fillPercentage}%\n`;
    summary += `- Non-empty rows: ${col.nonEmptyRows} / ${col.totalRows}\n`;
    if (col.sampleValue) {
      summary += `- Sample value: ${col.sampleValue}\n`;
    }
    summary += `\n---\n\n`;
  });
  
  if (irrelevantColumns.length > 0) {
    summary += `## ❌ Irrelevant/Blank Columns\n\n`;
    summary += `These columns are completely empty and can be ignored:\n\n`;
    irrelevantColumns.forEach(col => {
      summary += `- **Column ${col.columnNumber}: ${col.header}**`;
      if (col.description && col.description !== 'No description provided') {
        summary += ` - ${col.description}`;
      }
      summary += `\n`;
    });
  }
  
  fs.writeFileSync(summaryPath, summary);
  console.log(`📝 Human-readable summary saved to: ${summaryPath}`);
  
  console.log('\n✅ Analysis complete!\n');
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  console.error(error.stack);
  process.exit(1);
}

