const XLSX = require('xlsx');
const fs = require('fs');

const filePath = './TRAINED DTR_Summary.959740.csv.xlsx';

if (!fs.existsSync(filePath)) {
  console.log('File not found:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

console.log('📊 Excel File Analysis\n');
console.log('='.repeat(80));
console.log(`Sheet: ${sheetName}`);
console.log(`Total rows: ${range.e.r + 1}`);
console.log(`Total columns: ${range.e.c + 1}\n`);

// Show row 3 (header row, index 2)
console.log('📋 HEADER ROW (Row 3, index 2) - All columns:');
console.log('-'.repeat(80));
const headerRow = [];
for (let c = 0; c <= range.e.c; c++) {
  const cellAddress = XLSX.utils.encode_cell({ c, r: 2 });
  const cell = worksheet[cellAddress];
  const colLetter = String.fromCharCode(65 + (c % 26)) + (c >= 26 ? String.fromCharCode(64 + Math.floor(c/26)) : '');
  const value = cell ? (cell.v !== undefined ? String(cell.v) : '') : '';
  headerRow.push({ col: colLetter, index: c, value: value });
  if (c < 30 || value) { // Show first 30 or non-empty
    console.log(`${colLetter.padEnd(4)} (index ${String(c).padStart(2)}): ${value || '(empty)'}`);
  }
}

console.log('\n📊 FIRST DATA ROW (Row 4, index 3) - Sample values:');
console.log('-'.repeat(80));
for (let c = 0; c <= Math.min(range.e.c, 30); c++) {
  const cellAddress = XLSX.utils.encode_cell({ c, r: 3 });
  const cell = worksheet[cellAddress];
  const colLetter = String.fromCharCode(65 + (c % 26)) + (c >= 26 ? String.fromCharCode(64 + Math.floor(c/26)) : '');
  const value = cell ? (cell.v !== undefined ? String(cell.v).substring(0, 30) : '') : '';
  if (value || c < 15) {
    console.log(`${colLetter.padEnd(4)} (index ${String(c).padStart(2)}): ${value || '(empty)'}`);
  }
}

// Find specific columns
console.log('\n🔍 Looking for key columns:');
console.log('-'.repeat(80));
const keyColumns = ['CAN', 'ADDRSTRING', 'ZIPCODE', 'ZIP_CODE', 'LEGALSTATUS', 'LEGAL_STATUS', 'STATUS', 'SPECIAL_STATUS'];
keyColumns.forEach(key => {
  const found = headerRow.find(h => h.value && h.value.toUpperCase().includes(key));
  if (found) {
    console.log(`✅ ${key}: Found at ${found.col} (index ${found.index})`);
  }
});

