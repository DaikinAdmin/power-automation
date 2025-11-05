import excelToJson from 'excel-parser-to-json';

const result = excelToJson({
    sourceFile: './src/resources/data.xlsx',
    header: {
        rows: 1    // Skip first row (header)
    },
    columnToKey: {
        'A': 'id',
        'B': 'name',
        'C': 'email',
        '*': 'defaultKey'  // Default key for unmapped columns
    }
});