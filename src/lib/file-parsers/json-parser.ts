import { UploadType } from "@/helpers/types/item";


export function parseJSON(buffer: Buffer): UploadType[] {
  try {
    const jsonContent = buffer.toString('utf-8');
    const data = JSON.parse(jsonContent);
    
    // Handle both single object and array of objects
    const items: UploadType[] = Array.isArray(data) ? data : [data];
    
    // Convert and validate each item
    return items.map((item: UploadType) => {
      // Convert string booleans to actual booleans
      if (typeof item.isDisplayed === 'string') {
        item.isDisplayed = item.isDisplayed === 'true';
      }

      // Convert string numbers to actual numbers
      const numericFields = ['price', 'quantity', 'promotionPrice', 'warrantyLength', 'sellCounter', 'discount', 'popularity'];
      numericFields.forEach(field => {
        if ((item as any)[field] !== null && (item as any)[field] !== undefined) {
          const num = parseFloat((item as any)[field]);
          if (!isNaN(num)) {
            (item as any)[field] = num;
          }
        }
      });
      
      // Handle date fields
      if (item.promoEndDate && typeof item.promoEndDate === 'string') {
        item.promoEndDate = new Date(item.promoEndDate).toISOString();
      }
      
      return item as UploadType;
    });
  } catch (error: unknown) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
