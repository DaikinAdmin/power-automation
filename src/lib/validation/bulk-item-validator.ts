// import { Item, UploadType } from '@/helpers/types/item';
// import { Badge, PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// export interface ValidationResult {
//   isValid: boolean;
//   errors: string[];
//   validItems: UploadType[];
//   invalidItems: Array<{ item: UploadType; errors: string[] }>;
// }

// export interface ProcessingResult {
//   success: boolean;
//   processed: number;
//   errors: string[];
//   duplicates: string[];
// }

// const REQUIRED_FIELDS = [
//   'articleId',
//   'categoryName', 
//   'subCategoryName',
//   'itemName',
//   'description',
//   'warehouseName',
//   'price',
//   'quantity'
// ];

// const NUMERIC_FIELDS = [
//   'price',
//   'quantity',
//   'promotionPrice',
//   'warrantyLength',
//   'sellCounter',
//   'discount',
//   'popularity'
// ];

// const BADGE_VALUES = Object.values(Badge);

// // export function validateBulkItems(items: UploadType[]): ValidationResult {
// //   const errors: string[] = [];
// //   const validItems: UploadType[] = [];
// //   const invalidItems: Array<{ item: any; errors: string[] }> = [];
// //   const seenArticleIds = new Set<string>();
// //   console.log("Validating items: ", items);
// //   items.forEach((item, index) => {
// //     const itemErrors: string[] = [];
    
// //     // Check required fields
// //     REQUIRED_FIELDS.forEach(field => {
// //       if (!(item as any)[field] || (item as any)[field] === '') {
// //         itemErrors.push(`Row ${index + 1}: ${field} is required`);
// //       }
// //     });

// //     // Check data types
// //     NUMERIC_FIELDS.forEach(field => {
// //       if ((item as any)[field] !== null && (item as any)[field] !== undefined && (item as any)[field] !== '') {
// //         const num = parseFloat((item as any)[field]);
// //         if (isNaN(num)) {
// //           itemErrors.push(`Row ${index + 1}: ${field} must be a number`);
// //         } else {
// //           (item as any)[field] = num;
// //         }
// //       }
// //     });

// //     // Validate boolean fields
// //     if (item.isDisplayed !== undefined && typeof item.isDisplayed !== 'boolean') {
// //       if (typeof item.isDisplayed === 'string') {
// //         item.isDisplayed = item.isDisplayed === 'true';
// //       } else {
// //         itemErrors.push(`Row ${index + 1}: isDisplayed must be a boolean`);
// //       }
// //     }

// //     // Validate badge enum
// //     if (item.badge && !BADGE_VALUES.includes(item.badge as Badge)) {
// //       itemErrors.push(`Row ${index + 1}: badge must be one of: ${BADGE_VALUES.join(', ')}`);
// //     }

// //     // Check for duplicate articleIds within the batch
// //     if (item.articleId) {
// //       if (seenArticleIds.has(item.articleId)) {
// //         itemErrors.push(`Row ${index + 1}: Duplicate articleId '${item.articleId}' found in batch`);
// //       } else {
// //         seenArticleIds.add(item.articleId);
// //       }
// //     }

// //     // Validate price constraints
// //     if (item.price !== undefined && item.price < 0) {
// //       itemErrors.push(`Row ${index + 1}: price must be greater than or equal to 0`);
// //     }

// //     if (item.quantity !== undefined && item.quantity < 0) {
// //       itemErrors.push(`Row ${index + 1}: quantity must be greater than or equal to 0`);
// //     }

// //     if (item.promotionPrice !== undefined && item.promotionPrice < 0) {
// //       itemErrors.push(`Row ${index + 1}: promotionPrice must be greater than or equal to 0`);
// //     }

// //     // Validate date fields
// //     if (item.promoEndDate) {
// //       const date = new Date(item.promoEndDate);
// //       if (isNaN(date.getTime())) {
// //         itemErrors.push(`Row ${index + 1}: promoEndDate must be a valid date`);
// //       }
// //     }

// //     // Validate articleId format (basic validation)
// //     if (item.articleId && typeof item.articleId === 'string') {
// //       if (item.articleId.length < 3 || item.articleId.length > 50) {
// //         itemErrors.push(`Row ${index + 1}: articleId must be between 3 and 50 characters`);
// //       }
// //     }

// //     // Validate warranty length if provided
// //     if (item.warrantyLength !== undefined && item.warrantyLength !== null) {
// //       if (item.warrantyLength < 0 || item.warrantyLength > 120) {
// //         itemErrors.push(`Row ${index + 1}: warrantyLength must be between 0 and 120 months`);
// //       }
// //     }

// //     // Validate discount percentage
// //     if (item.discount !== undefined && item.discount !== null) {
// //       if (item.discount < 0 || item.discount > 100) {
// //         itemErrors.push(`Row ${index + 1}: discount must be between 0 and 100 percent`);
// //       }
// //     }

// //     // Validate popularity rating
// //     if (item.popularity !== undefined && item.popularity !== null) {
// //       if (item.popularity < 0 || item.popularity > 10) {
// //         itemErrors.push(`Row ${index + 1}: popularity must be between 0 and 10`);
// //       }
// //     }

// //     if (itemErrors.length > 0) {
// //       invalidItems.push({ item, errors: itemErrors });
// //       errors.push(...itemErrors);
// //     } else {
// //       validItems.push(item);
// //     }
// //   });

// //   return {
// //     isValid: errors.length === 0,
// //     errors,
// //     validItems,
// //     invalidItems
// //   };
// // }

// export async function validateAndResolveReferences(items: UploadType[]): Promise<{ 
//   isValid: boolean;
//   errors: string[];
//   resolvedItems: UploadType[];
//   invalidItems: Array<{ item: UploadType; errors: string[] }>;
// }> {
//   const errors: string[] = [];
//   const resolvedItems: UploadType[] = [];
//   const invalidItems: Array<{ item: UploadType; errors: string[] }> = [];

//   for (let i = 0; i < items.length; i++) {
//     // console.log("Items: ", items[i]);
//     const item = items[i];
//     const itemErrors: string[] = [];

//     // Resolve category by name
//     const category = await prisma.category.findFirst({
//       where: { 
//         name: { equals: item.categoryName, mode: 'insensitive' },
//         isVisible: true
//       }
//     });
//     if (!category) {
//       itemErrors.push(`Row ${i + 1}: Category '${item.categoryName}' does not exist or is not visible`);
//     }

//     // Resolve subcategory by name and verify it belongs to the category
//     let subCategory = null;
//     if (category) {
//       subCategory = await prisma.subCategories.findFirst({
//         where: { 
//           name: { equals: item.subCategoryName, mode: 'insensitive' },
//           categoryId: category.id,
//           isVisible: true
//         }
//       });
//       if (!subCategory) {
//         itemErrors.push(`Row ${i + 1}: SubCategory '${item.subCategoryName}' does not exist in category '${item.categoryName}' or is not visible`);
//       }
//     } else {
//       // If category doesn't exist, still try to find subcategory for better error message
//       subCategory = await prisma.subCategories.findFirst({
//         where: { 
//           name: { equals: item.subCategoryName, mode: 'insensitive' },
//           isVisible: true
//         }
//       });
//       if (subCategory) {
//         itemErrors.push(`Row ${i + 1}: SubCategory '${item.subCategoryName}' exists but does not belong to category '${item.categoryName}'`);
//       } else {
//         itemErrors.push(`Row ${i + 1}: SubCategory '${item.subCategoryName}' does not exist or is not visible`);
//       }
//     }

//     // Resolve warehouse by displayedName
//     const warehouse = await prisma.warehouse.findFirst({
//       where: { 
//         name: { equals: item.warehouseName, mode: 'insensitive' },
//         isVisible: true
//       }
//     });
//     if (!warehouse) {
//       itemErrors.push(`Row ${i + 1}: Warehouse '${item.warehouseName}' does not exist or is not visible`);
//     }

//     // Resolve brand by name (if provided)
//     let brand = null;
//     if (item.brandName && item.brandName.trim() !== '') {
//       brand = await prisma.brand.findFirst({
//         where: { 
//           name: { equals: item.brandName, mode: 'insensitive' },
//           isVisible: true
//         }
//       });
//       if (!brand) {
//         itemErrors.push(`Row ${i + 1}: Brand '${item.brandName}' does not exist or is not visible`);
//       }
//     }

//     // Check if item with same articleId already exists
//     const existingItem = await prisma.item.findFirst({
//       where: { articleId: item.articleId }
//     });
//     if (existingItem) {
//       itemErrors.push(`Row ${i + 1}: Item with articleId '${item.articleId}' already exists`);
//     }

//     if (itemErrors.length > 0) {
//       invalidItems.push({ item, errors: itemErrors });
//       errors.push(...itemErrors);
//     } else {
//       // Update the warehouse reference in itemPrice instead of adding warehouseId to item
//       const resolvedItem = {
//         ...item,
//         categoryId: category!.id,
//         subCategoryId: subCategory!.id,
//         brandId: brand?.id || null,
//         itemPrice: [{
//           price: item.price,
//           quantity: item.quantity,
//           promotionPrice: item.promotionPrice || null,
//           promoCode: item.promoCode || null,
//           promoEndDate: item.promoEndDate || null,
//           badge: item.badge || null,
//           warehouseId: warehouse!.id
//         }]
//       };
//       resolvedItems.push(resolvedItem);
//     }
//   }

//   return {
//     isValid: errors.length === 0,
//     errors,
//     resolvedItems,
//     invalidItems
//   };
// }

// export async function processBulkItems(items: Item[]): Promise<ProcessingResult> {
//   let processed = 0;
//   const errors: string[] = [];
//   const duplicates: string[] = []; 

//         try {
//           // Create the main item
//           const createdItem = await prisma.item.createMany({
//             data: items.map(item => ({
//               articleId: item.articleId,
//               isDisplayed: item.isDisplayed ?? false,
//               itemImageLink: item.itemImageLink || null,
//               categoryId: item.categoryId,
//               subCategoryId: item.subCategoryId,
//               brandId: item.brandId || null,
//               brandName: item.brandName || null,
//               warrantyType: item.warrantyType || null,
//               warrantyLength: item.warrantyLength || null,
//               sellCounter: item.sellCounter ?? 0,
//               create: {
//                 itemDetails: {
//                   create: item.itemDetails.map(detail => ({
//                     locale: detail.locale ?? 'pl',
//                     description: detail.description,
//                     specifications: detail.specifications || "",
//                     itemName: detail.itemName,
//                     seller: detail.seller || "",
//                     discount: detail.discount || "",
//                     popularity: detail.popularity || "",
//                   }))
//                 },
//                 itemPrice: {
//                   create: item.itemPrice.map(price => ({
//                     warehouseId: price.warehouseId,
//                     price: price.price,
//                     quantity: price.quantity,
//                     promotionPrice: price.promotionPrice || null,
//                     promoCode: price.promoCode || null,
//                     promoEndDate: price.promoEndDate ? new Date(price.promoEndDate) : null,
//                     badge: price.badge || Badge.ABSENT,
//                   }))
//                 }
//               }
//             }))
//           });

//           processed++;

//     return {
//       success: errors.length === 0,
//       processed,
//       errors,
//       duplicates
//     };
//   } catch (error: any) {
//     return {
//       success: false,
//       processed,
//       errors: [`Transaction failed: ${error.message}`],
//       duplicates
//     };
//   }
// }
import { Item, UploadType } from '@/helpers/types/item';
import { Badge, PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validItems: UploadType[];
  invalidItems: Array<{ item: UploadType; errors: string[] }>;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  errors: string[];
  duplicates: string[];
}

const REQUIRED_FIELDS = [
  'articleId',
  'categoryName', 
  'subCategoryName',
  'itemName',
  'description',
  'warehouseName',
  'price',
  'quantity'
];

const NUMERIC_FIELDS = [
  'price',
  'quantity',
  'promotionPrice',
  'warrantyLength',
  'sellCounter',
  'discount',
  'popularity'
];

const BADGE_VALUES = Object.values(Badge);

export async function validateAndResolveReferences(items: UploadType[]): Promise<{ 
  isValid: boolean;
  errors: string[];
  resolvedItems: UploadType[];
  invalidItems: Array<{ item: UploadType; errors: string[] }>;
}> {
  const errors: string[] = [];
  const resolvedItems: UploadType[] = [];
  const invalidItems: Array<{ item: UploadType; errors: string[] }> = [];

  // Filter out empty rows
  const validItems = items.filter(item => {
    return item.articleId && 
           item.articleId.toString().trim() !== '' && 
           item.categoryName && 
           item.categoryName.toString().trim() !== '';
  });

  console.log(`Processing ${validItems.length} valid items out of ${items.length} total items`);

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const itemErrors: string[] = [];

    // Validate required fields first
    REQUIRED_FIELDS.forEach(field => {
      const value = (item as any)[field];
      if (!value || value.toString().trim() === '') {
        itemErrors.push(`Row ${i + 1}: ${field} is required`);
      }
    });

    // Skip database validation if required fields are missing
    if (itemErrors.length > 0) {
      invalidItems.push({ item, errors: itemErrors });
      errors.push(...itemErrors);
      continue;
    }

    try {
      // Resolve category by name
      const category = await prisma.category.findFirst({
        where: { 
          name: { 
            equals: item.categoryName.toString().trim(), 
            mode: 'insensitive' 
          },
          isVisible: true
        }
      });
      
      if (!category) {
        itemErrors.push(`Row ${i + 1}: Category '${item.categoryName}' does not exist or is not visible`);
      }

      // Resolve subcategory by name and verify it belongs to the category
      let subCategory = null;
      if (category && item.subCategoryName && item.subCategoryName.toString().trim() !== '') {
        subCategory = await prisma.subCategories.findFirst({
          where: { 
            name: { 
              equals: item.subCategoryName.toString().trim(), 
              mode: 'insensitive' 
            },
            categoryId: category.id,
            isVisible: true
          }
        });
        
        if (!subCategory) {
          itemErrors.push(`Row ${i + 1}: SubCategory '${item.subCategoryName}' does not exist in category '${item.categoryName}' or is not visible`);
        }
      } else if (item.subCategoryName && item.subCategoryName.toString().trim() !== '') {
        // If category doesn't exist, still try to find subcategory for better error message
        subCategory = await prisma.subCategories.findFirst({
          where: { 
            name: { 
              equals: item.subCategoryName.toString().trim(), 
              mode: 'insensitive' 
            },
            isVisible: true
          }
        });
        
        if (subCategory) {
          itemErrors.push(`Row ${i + 1}: SubCategory '${item.subCategoryName}' exists but does not belong to category '${item.categoryName}'`);
        } else {
          itemErrors.push(`Row ${i + 1}: SubCategory '${item.subCategoryName}' does not exist or is not visible`);
        }
      }

      // Resolve warehouse by name
      const warehouse = await prisma.warehouse.findFirst({
        where: { 
          name: { 
            equals: item.warehouseName.toString().trim(), 
            mode: 'insensitive' 
          },
          isVisible: true
        }
      });
      
      if (!warehouse) {
        itemErrors.push(`Row ${i + 1}: Warehouse '${item.warehouseName}' does not exist or is not visible`);
      }

      // Resolve brand by name (if provided)
      let brand = null;
      if (item.brandName && item.brandName.toString().trim() !== '') {
        brand = await prisma.brand.findFirst({
          where: { 
            name: { 
              equals: item.brandName.toString().trim(), 
              mode: 'insensitive' 
            },
            isVisible: true
          }
        });
        
        if (!brand) {
          itemErrors.push(`Row ${i + 1}: Brand '${item.brandName}' does not exist or is not visible`);
        }
      }

      // Check if item with same articleId already exists
      const existingItem = await prisma.item.findFirst({
        where: { articleId: item.articleId.toString().trim() }
      });
      
      if (existingItem) {
        // Item exists - this is for update, not an error
        console.log(`Item with articleId '${item.articleId}' already exists - will be updated`);
      }

      if (itemErrors.length > 0) {
        invalidItems.push({ item, errors: itemErrors });
        errors.push(...itemErrors);
      } else {
        // Create resolved item with proper data types
        const resolvedItem: any = {
          ...item,
          articleId: item.articleId.toString().trim(),
          categoryName: item.categoryName.toString().trim(),
          subCategoryName: item.subCategoryName.toString().trim(),
          warehouseName: item.warehouseName.toString().trim(),
          brandName: item.brandName ? item.brandName.toString().trim() : '',
          categoryId: category!.id,
          subCategoryId: subCategory!.id,
          brandId: brand?.id || null,
          warehouseId: warehouse!.id,
          // Ensure numeric fields are properly converted
          price: parseFloat(item.price.toString()) || 0,
          quantity: parseInt(item.quantity.toString()) || 0,
          promotionPrice: item.promotionPrice ? parseFloat(item.promotionPrice.toString()) : null,
          warrantyLength: item.warrantyLength ? parseInt(item.warrantyLength.toString()) : null,
          sellCounter: item.sellCounter ? parseInt(item.sellCounter.toString()) : 0,
          discount: item.discount ? parseFloat(item.discount.toString()) : null,
          popularity: item.popularity ? parseInt(item.popularity.toString()) : null,
          // Convert boolean properly
          isDisplayed: item.isDisplayed === true,
        };
        
        resolvedItems.push(resolvedItem);
      }
    } catch (error: any) {
      console.error(`Error validating item ${item.articleId}:`, error);
      itemErrors.push(`Row ${i + 1}: Database validation error - ${error.message}`);
      invalidItems.push({ item, errors: itemErrors });
      errors.push(...itemErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    resolvedItems,
    invalidItems
  };
}

export async function processBulkItems(items: Item[]): Promise<ProcessingResult> {
  let processed = 0;
  const errors: string[] = [];
  const duplicates: string[] = []; 

  try {
    // Create the main item
    const createdItem = await prisma.item.createMany({
      data: items.map(item => ({
        articleId: item.articleId,
        isDisplayed: item.isDisplayed ?? false,
        itemImageLink: item.itemImageLink || null,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        brandId: item.brandId || null,
        brandName: item.brandName || null,
        warrantyType: item.warrantyType || null,
        warrantyLength: item.warrantyLength || null,
        sellCounter: item.sellCounter ?? 0,
      }))
    });

    processed = createdItem.count;

    return {
      success: errors.length === 0,
      processed,
      errors,
      duplicates
    };
  } catch (error: any) {
    return {
      success: false,
      processed,
      errors: [`Transaction failed: ${error.message}`],
      duplicates
    };
  }
}