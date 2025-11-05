const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample data for Excel file
const sampleData = [
  {
    articleId: 'EXCEL001',
    isDisplayed: true,
    itemImageLink: 'https://example.com/excel1.jpg',
    categoryName: 'Gaming',
    subCategoryName: 'Gaming Consoles',
    brandName: 'Excel Brand',
    warrantyType: 'Manufacturer',
    warrantyLength: 24,
    sellCounter: 0,
    locale: 'pl',
    itemName: 'Gaming Console',
    description: 'Next-generation gaming console with 4K gaming',
    specifications: '8-core CPU, 16GB GDDR6, 1TB SSD, Ray tracing support',
    seller: 'GameWorld',
    discount: 12,
    popularity: 9,
    warehouseName: 'Main Warehouse',
    price: 499.99,
    quantity: 15,
    promotionPrice: 449.99,
    promoCode: 'CONSOLE12',
    promoEndDate: '2024-12-20',
    badge: 'HOT_DEALS'
  },
  {
    articleId: 'EXCEL002',
    isDisplayed: false,
    itemImageLink: null,
    categoryName: 'Accessories',
    subCategoryName: 'Mobile Accessories',
    brandName: null,
    warrantyType: 'Distributor',
    warrantyLength: 6,
    sellCounter: 3,
    locale: 'pl',
    itemName: 'Phone Charger',
    description: 'Universal fast charging cable',
    specifications: 'USB-C to USB-A, 3A charging, 1.5m length',
    seller: 'MobileAccessories',
    discount: null,
    popularity: 6,
    warehouseName: 'Secondary Warehouse',
    price: 19.99,
    quantity: 500,
    promotionPrice: null,
    promoCode: null,
    promoEndDate: null,
    badge: 'ABSENT'
  }
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');

// Ensure directory exists
const publicDir = path.join(__dirname, '..', 'public', 'sample-data');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write file
const filePath = path.join(publicDir, 'items_sample.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`Excel sample file created at: ${filePath}`);
