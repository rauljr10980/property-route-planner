const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('./TRAINED DTR_Summary.959740.csv.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

console.log('Checking LEGALSTATUS column (EA, index 30) in first 20 data rows:');
console.log('Row | CAN (E) | ADDRSTRING (H) | LEGALSTATUS (EA)');
console.log('-'.repeat(70));

for (let r = 3; r < Math.min(23, range.e.r + 1); r++) {
  const canCell = XLSX.utils.encode_cell({ c: 4, r });
  const addrCell = XLSX.utils.encode_cell({ c: 7, r });
  const legalCell = XLSX.utils.encode_cell({ c: 30, r });
  
  const can = worksheet[canCell] ? worksheet[canCell].v : '';
  const addr = worksheet[addrCell] ? String(worksheet[addrCell].v).substring(0, 25) : '';
  const legal = worksheet[legalCell] ? String(worksheet[legalCell].v) : '';
  
  console.log(`${String(r + 1).padStart(3)} | ${String(can).padStart(8)} | ${addr.padEnd(25)} | ${legal}`);
}

// Check unique LEGALSTATUS values
console.log('\n\nUnique LEGALSTATUS values in first 100 rows:');
const legalStatuses = new Set();
for (let r = 3; r < Math.min(103, range.e.r + 1); r++) {
  const legalCell = XLSX.utils.encode_cell({ c: 30, r });
  const legal = worksheet[legalCell] ? String(worksheet[legalCell].v).trim() : '';
  if (legal) legalStatuses.add(legal);
}
console.log(Array.from(legalStatuses).sort().join(', '));

