import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('./src/resources/f6b877e1595c2ca7e216e3129665c4f4.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Total rows:', rawData.length);
console.log('\nFirst 3 rows with all columns:');
rawData.slice(0, 3).forEach((row, idx) => {
  console.log(`\nRow ${idx}:`);
  row.slice(0, 30).forEach((cell, colIdx) => {
    const colLetter = String.fromCharCode(65 + colIdx);
    if (cell !== undefined && cell !== null && cell !== '') {
      console.log(`  ${colLetter} (${colIdx}):`, String(cell).substring(0, 50));
    }
  });
});
