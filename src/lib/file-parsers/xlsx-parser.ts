import { UploadType } from '@/helpers/types/item';
import excelToJson from 'excel-parser-to-json';


export function parseXLSX(buffer: Buffer): UploadType[] {
  try {
    const result = excelToJson({
        source: buffer,
        header: {
            rows: 1
        },
        columnToKey: {
            A: 'articleId',
            B: 'categoryName',
            C: 'subCategoryName',
            D: 'itemName',
            E: 'description',
            F: 'warehouseName',
            G: 'price',
            H: 'quantity',
            I: 'promotionPrice',
            J: 'promoEndDate',
            K: 'warrantyLength',
            L: 'sellCounter',
            M: 'discount',
            N: 'popularity',
            O: 'isDisplayed',
            P: 'brandName',
            Q: 'badge'
        }
    });
    return result as any as UploadType[];
  } catch (error) {
    throw new Error(`Failed to parse XLSX: ${error instanceof Error ? error.message : String(error)}`);
  }
}
