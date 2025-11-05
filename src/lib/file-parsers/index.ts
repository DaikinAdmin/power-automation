import { parseCSV } from './csv-parser';
import { parseJSON } from './json-parser';
import { parseXLSX } from './xlsx-parser';

export function getParser(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'csv':
      return parseCSV;
    case 'xlsx':
    case 'xls':
      return parseXLSX;
    case 'json':
      return parseJSON;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
