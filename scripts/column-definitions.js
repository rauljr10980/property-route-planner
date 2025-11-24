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

console.log('📊 Extracting Column Definitions from TRAINED DTR_Summary.959740.csv.xlsx');
console.log('=' .repeat(100));

try {
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON - keep all rows including empty cells
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
  
  console.log(`\n📄 Sheet: ${sheetName}`);
  console.log(`📊 Total rows: ${jsonData.length}`);
  
  // Row 2 (index 1) contains the column descriptions/meanings
  const descriptionRow = jsonData[1] || []; // Row 2
  
  // Row 3 (index 2) contains the actual column headers
  const headerRow = jsonData[2] || []; // Row 3
  
  const maxColumns = Math.max(
    descriptionRow.length,
    headerRow.length,
    ...jsonData.map(row => row ? row.length : 0)
  );
  
  console.log(`📋 Total columns: ${maxColumns}\n`);
  
  // Analyze each column
  const columns = [];
  const dataRows = jsonData.slice(3); // Data starts at row 4 (index 3)
  
  for (let col = 0; col < maxColumns; col++) {
    const header = headerRow[col] ? String(headerRow[col]).trim() : `Column_${col + 1}`;
    const description = descriptionRow[col] ? String(descriptionRow[col]).trim() : null;
    
    // Count empty vs non-empty cells in data rows
    let nonEmptyCount = 0;
    let emptyCount = 0;
    let sampleValues = [];
    
    dataRows.forEach(row => {
      const cell = row && row[col];
      if (cell === null || cell === undefined || String(cell).trim() === '') {
        emptyCount++;
      } else {
        nonEmptyCount++;
        // Collect sample values
        if (sampleValues.length < 3) {
          const value = String(cell).trim();
          if (value.length > 100) {
            sampleValues.push(value.substring(0, 100) + '...');
          } else {
            sampleValues.push(value);
          }
        }
      }
    });
    
    const totalRows = emptyCount + nonEmptyCount;
    const fillPercentage = totalRows > 0 ? (nonEmptyCount / totalRows * 100).toFixed(1) : '0.0';
    const isRelevant = nonEmptyCount > 0;
    
    columns.push({
      columnNumber: col + 1,
      header: header,
      description: description,
      sampleValues: sampleValues,
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
  const irrelevantColumns = columns.filter(c => !c.isBlank); // Actually blank ones
  
  // Output results in a clear format
  console.log('📋 COLUMN DEFINITIONS:\n');
  console.log('=' .repeat(100));
  
  relevantColumns.forEach(col => {
    const status = col.isRelevant ? '✅' : '❌';
    const blank = col.fillPercentage < 1 ? ' ⚠️ (Mostly Blank)' : '';
    const relevant = col.fillPercentage >= 1 ? '' : ' ⚠️ (Low Fill Rate)';
    
    console.log(`\n${status} Column ${String(col.columnNumber).padStart(2)}: ${col.header}`);
    
    if (col.description) {
      console.log(`   📝 MEANING: ${col.description}`);
    } else {
      console.log(`   📝 MEANING: No description provided in the file`);
    }
    
    if (col.sampleValues.length > 0) {
      console.log(`   📄 Sample values: ${col.sampleValues.join(', ')}`);
    }
    
    console.log(`   📊 Data: ${col.fillPercentage}% filled (${col.nonEmptyRows.toLocaleString()} non-empty, ${col.emptyRows.toLocaleString()} empty)`);
    
    if (blank || relevant) {
      console.log(`   ${blank || relevant}`);
    }
  });
  
  // Show irrelevant columns
  const trulyBlank = columns.filter(c => c.isBlank);
  if (trulyBlank.length > 0) {
    console.log('\n' + '=' .repeat(100));
    console.log('\n❌ IRRELEVANT COLUMNS (Completely Blank):\n');
    
    trulyBlank.forEach(col => {
      console.log(`❌ Column ${String(col.columnNumber).padStart(2)}: ${col.header}`);
      if (col.description) {
        console.log(`   📝 Description: ${col.description}`);
      }
      console.log(`   ⚠️  STATUS: BLANK - No data found in any row (${col.totalRows.toLocaleString()} rows checked)`);
      console.log('');
    });
  }
  
  // Summary
  const mostlyBlank = relevantColumns.filter(c => c.fillPercentage < 5);
  
  console.log('=' .repeat(100));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   ✅ Relevant columns: ${relevantColumns.length}`);
  console.log(`   ⚠️  Mostly blank columns (<5% fill): ${mostlyBlank.length}`);
  console.log(`   ❌ Completely blank/irrelevant columns: ${trulyBlank.length}`);
  console.log(`   📋 Total columns: ${columns.length}`);
  console.log(`   📄 Total data rows: ${dataRows.length.toLocaleString()}`);
  
  // Create a clean output JSON for use in the application
  const output = {
    fileName: path.basename(excelFilePath),
    sheetName: sheetName,
    analysisDate: new Date().toISOString(),
    summary: {
      totalColumns: columns.length,
      relevantColumns: relevantColumns.length,
      mostlyBlankColumns: mostlyBlank.length,
      blankColumns: trulyBlank.length,
      totalDataRows: dataRows.length
    },
    columns: columns.map(col => ({
      columnNumber: col.columnNumber,
      header: col.header,
      description: col.description || null,
      meaning: col.description || 'No description provided in file',
      isRelevant: col.isRelevant,
      isBlank: col.isBlank,
      fillPercentage: col.fillPercentage,
      nonEmptyRows: col.nonEmptyRows,
      emptyRows: col.emptyRows,
      sampleValues: col.sampleValues
    })),
    relevantColumnsList: relevantColumns.map(col => ({
      header: col.header,
      description: col.description || 'No description provided',
      fillPercentage: col.fillPercentage
    })),
    irrelevantColumnsList: trulyBlank.map(col => ({
      header: col.header,
      description: col.description || 'No description provided'
    }))
  };
  
  // Save to JSON file
  const outputPath = path.join(__dirname, '..', 'column-definitions.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Column definitions saved to: ${path.basename(outputPath)}`);
  
  // Create a markdown file with column meanings
  const mdPath = path.join(__dirname, '..', 'COLUMN_MEANINGS.md');
  let mdContent = `# Column Meanings - TRAINED DTR_Summary.959740.csv.xlsx\n\n`;
  mdContent += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  mdContent += `**Summary:** ${output.summary.relevantColumns} relevant columns | ${output.summary.blankColumns} blank columns | ${output.summary.totalColumns} total columns\n\n`;
  mdContent += `---\n\n## 📋 Column Definitions\n\n`;
  mdContent += `> **Note:** These definitions come from row 2 of the Excel file. If a column has no description, it means the description cell was blank.\n\n`;
  
  relevantColumns.forEach(col => {
    mdContent += `### Column ${col.columnNumber}: \`${col.header}\`\n\n`;
    if (col.description) {
      mdContent += `**Meaning:** ${col.description}\n\n`;
    } else {
      mdContent += `**Meaning:** No description provided in the file\n\n`;
    }
    mdContent += `- **Fill Rate:** ${col.fillPercentage}% (${col.nonEmptyRows.toLocaleString()} non-empty / ${col.totalRows.toLocaleString()} total rows)\n`;
    if (col.sampleValues.length > 0) {
      mdContent += `- **Sample values:** ${col.sampleValues.join(', ')}\n`;
    }
    if (col.fillPercentage < 5) {
      mdContent += `- ⚠️ **Note:** Mostly blank - may be irrelevant for most properties\n`;
    }
    mdContent += `\n---\n\n`;
  });
  
  if (trulyBlank.length > 0) {
    mdContent += `## ❌ Blank/Irrelevant Columns\n\n`;
    mdContent += `These columns are completely empty and can be ignored:\n\n`;
    trulyBlank.forEach(col => {
      mdContent += `- **Column ${col.columnNumber}: \`${col.header}\`**`;
      if (col.description) {
        mdContent += ` - ${col.description}`;
      }
      mdContent += `\n`;
    });
  }
  
  fs.writeFileSync(mdPath, mdContent);
  console.log(`📝 Column meanings documentation saved to: ${path.basename(mdPath)}`);
  
  // Show key columns
  console.log('\n' + '=' .repeat(100));
  console.log('\n🔑 KEY COLUMNS (with descriptions):\n');
  
  const keyColumns = relevantColumns.filter(col => col.description && col.fillPercentage > 10);
  keyColumns.slice(0, 15).forEach(col => {
    console.log(`   • ${col.header.padEnd(25)} → ${col.description.substring(0, 80)}`);
  });
  
  if (keyColumns.length > 15) {
    console.log(`   ... and ${keyColumns.length - 15} more columns with descriptions`);
  }
  
  console.log('\n✅ Analysis complete!\n');
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
  console.error(error.stack);
  process.exit(1);
}

