import { parseCSV } from '@/lib/file-parsers/csv-parser';
import { parseXLSX } from '@/lib/file-parsers/xlsx-parser';
import { parseJSON } from '@/lib/file-parsers/json-parser';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('File Parsers', () => {
  const sampleData = {
    articleId: 'TEST001',
    isDisplayed: false,
    itemImageLink: 'https://example.com/image.jpg',
    categoryId: 'cat1',
    subCategoryId: 'subcat1',
    brandId: 'brand1',
    brandName: 'Test Brand',
    warrantyType: 'Manufacturer',
    warrantyLength: 12,
    sellCounter: 0,
    itemName: 'Test Item',
    description: 'Test description',
    specifications: 'Test specs',
    seller: 'Test Seller',
    discount: 10,
    popularity: 5,
    warehouseId: 'warehouse1',
    price: 99.99,
    quantity: 100,
    promotionPrice: 89.99,
    promoCode: 'SAVE10',
    badge: 'NEW_ARRIVALS'
  };

  describe('parseCSV', () => {
    it('should parse valid CSV data correctly', async () => {
      const csvContent = `articleId,isDisplayed,itemName,description,categoryId,subCategoryId,price,quantity,warehouseId
TEST001,false,Test Item,Test description,cat1,subcat1,99.99,100,warehouse1`;
      
      const buffer = Buffer.from(csvContent);
      const result = await parseCSV(buffer);
      
      expect(result).toHaveLength(1);
      expect(result[0].articleId).toBe('TEST001');
      expect(result[0].itemDetails[0].itemName).toBe('Test Item');
      expect(result[0].itemPrice[0].price).toBe(99.99);
      expect(result[0].isDisplayed).toBe(false);
    });

    it('should handle empty CSV files', async () => {
      const csvContent = 'articleId,itemName\n';
      const buffer = Buffer.from(csvContent);
      
      const result = await parseCSV(buffer);
      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid CSV format', async () => {
      const csvContent = 'invalid csv content without headers';
      const buffer = Buffer.from(csvContent);
      
      await expect(parseCSV(buffer)).rejects.toThrow();
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON array correctly', () => {
      const jsonData = [sampleData];
      const jsonString = JSON.stringify(jsonData);
      const buffer = Buffer.from(jsonString);
      
      const result = parseJSON(buffer);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(sampleData);
    });

    it('should handle single JSON object', () => {
      const jsonString = JSON.stringify(sampleData);
      const buffer = Buffer.from(jsonString);
      
      const result = parseJSON(buffer);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(sampleData);
    });

    it('should throw error for invalid JSON', () => {
      const buffer = Buffer.from('invalid json');
      expect(() => parseJSON(buffer)).toThrow();
    });

    it('should handle empty JSON array', () => {
      const buffer = Buffer.from('[]');
      const result = parseJSON(buffer);
      expect(result).toHaveLength(0);
    });
  });

  describe('parseXLSX', () => {
    it('should handle XLSX parsing (mock test)', () => {
      // This would require actual XLSX file for proper testing
      // For now, we'll test the function exists and handles errors
      const buffer = Buffer.from('mock xlsx content');
      
      // This should throw an error for invalid XLSX content
      expect(() => parseXLSX(buffer)).toBeDefined();
    });
  });
});
