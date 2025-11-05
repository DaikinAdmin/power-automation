import { parse } from 'csv-parse/sync';
import { UploadType } from '@/helpers/types/item';

export async function parseCSV(buffer: Buffer): Promise<UploadType[]> {
  try {
    const csvContent = buffer.toString('utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        // Convert string values to appropriate types
        if (context.header) return value;
        
        // Handle boolean fields
        if (String(context.column) === 'isDisplayed') {
          return value.toLowerCase() === 'true';
        }
        
        // Handle numeric fields
        if (['price', 'quantity', 'promotionPrice', 'warrantyLength', 'sellCounter', 'discount', 'popularity'].includes(String(context.column))) {
          const num = parseFloat(value);
          return isNaN(num) ? value : num;
        }
        
        // Handle date fields
        if (String(context.column) === 'promoEndDate' && value) {
          return new Date(value).toISOString();
        }
        
        return value || null;
      }
    });

    return records as UploadType[];
  } catch (error: any) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}
