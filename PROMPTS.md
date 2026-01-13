

# Bulk Item Upload Implementation Plan

## Overview
Implement bulk item upload functionality supporting CSV, XLS, and JSON file formats.

## Implementation Steps

### Phase 1: Core Infrastructure
1. **Unit Tests Setup**
   - Create test files for file parsing utilities
   - Create test files for bulk upload API
   - Set up mock data and test scenarios

2. **File Parsing Utilities**
   - CSV parser using `csv-parser` library
   - XLS parser using `xlsx` library  
   - JSON parser with validation
   - Common validation logic for all formats

3. **API Endpoint**
   - POST `/api/admin/items/bulk-upload`
   - File upload handling with `multer` or similar
   - Data validation and sanitization
   - Batch database operations

### Phase 2: Frontend Components
4. **Bulk Upload Modal/Page**
   - File upload dropzone
   - Format selection
   - Progress indicator
   - Error handling and validation feedback
   - Preview of data before import

5. **Integration with Items Page**
   - Add bulk upload button to items management
   - Success/error notifications
   - Refresh items list after upload

### Phase 3: Testing & Documentation
6. **Sample Data Files**
   - items_sample.csv
   - items_sample.xlsx  
   - items_sample.json
   - Include all required fields from schema

7. **Validation & Error Handling**
   - Field validation against Prisma schema
   - Duplicate detection
   - Partial success handling
   - Detailed error reporting

## Required Fields (from schema.prisma & item.d.ts)
- articleId (required, unique)
- isDisplayed (boolean, default false)
- itemImageLink (optional)
- categorySlug (required, must exist)
- subCategorySlug (required, must exist)  
- brandId (optional, must exist if provided)
- brandName (optional)
- warrantyType (optional)
- warrantyLength (optional number)
- sellCounter (optional number, default 0)
- itemDetails (array):
  - locale (default "pl")
  - description (required)
  - specifications (optional)
  - itemName (required)
  - seller (optional)
  - discount (optional number)
  - popularity (optional number)
- itemPrice (array):
  - warehouseId (required, must exist)
  - price (required number)
  - quantity (required number)
  - promotionPrice (optional number)
  - promoCode (optional)
  - promoEndDate (optional date)
  - badge (optional enum)

## Libraries to Install
```bash
npm install csv-parser xlsx multer @types/multer
```

## File Structure
```
src/
├── __tests__/
│   ├── bulk-upload.test.ts
│   └── file-parsers.test.ts
├── lib/
│   ├── file-parsers/
│   │   ├── csv-parser.ts
│   │   ├── xlsx-parser.ts
│   │   ├── json-parser.ts
│   │   └── index.ts
│   └── validation/
│       └── bulk-item-validator.ts
├── app/api/admin/items/
│   └── bulk-upload/
│       └── route.ts
├── components/admin/
│   └── bulk-upload-modal.tsx
└── sample-data/
    ├── items_sample.csv
    ├── items_sample.xlsx
    └── items_sample.json
```

## Testing Strategy
1. Unit tests for each file parser
2. Integration tests for API endpoint
3. UI tests for upload component
4. End-to-end tests with sample files
5. Error scenario testing
