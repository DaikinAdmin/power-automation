import { NextRequest, NextResponse } from 'next/server';
import { getParser } from '@/lib/file-parsers';
import { validateAndResolveReferences } from '@/lib/validation/bulk-item-validator';
import { convertUploadTypeToItems } from '@/helpers/converters/uploadTypeConverter';
import prisma from '@/db';
import { BulkUploadItem, Item } from '@/helpers/types/item';
import { Badge } from '@prisma/client';

async function processBulkItems(items: BulkUploadItem[]): Promise<Item[]> {
  const processedItems: Item[] = [];

  for (const item of items) {
    try {
      // Check if item exists
      const existingItem = await prisma.item.findUnique({
        where: { articleId: item.articleId },
        include: {
          itemDetails: true,
          itemPrice: {
            include: {
              warehouse: true,
            }
          },
          category: true,
          subCategory: true,
          brand: true,
        }
      });

      let processedItem: Item;

      if (!existingItem) {
        // Create new item
        processedItem = await prisma.item.create({
          data: {
            articleId: item.articleId,
            isDisplayed: item.isDisplayed ?? false,
            itemImageLink: item.itemImageLink || null,
            sellCounter: item.sellCounter || 0,
            category: { connect: { id: item.categoryId } },
            subCategory: { connect: { id: item.subCategoryId } },
            brand: item.brandId ? { connect: { id: item.brandId } } : undefined,
            brandName: item.brandName || undefined,
            warrantyType: item.warrantyType || undefined,
            warrantyLength: item.warrantyLength || undefined,
            itemDetails: item.item_details ? {
              create: {
                locale: item.item_details.locale,
                itemName: item.item_details.itemName,
                description: item.item_details.description,
                specifications: item.item_details.specifications || null,
                seller: item.item_details.seller || null,
                discount: item.item_details.discount || null,
                popularity: item.item_details.popularity || null,
              }
            } : undefined,
            itemPrice: item.item_price ? {
              create: {
                warehouse: { connect: { id: item.item_price.warehouseId } },
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            } : undefined,
          },
          include: {
            category: {
              include: {
                subCategories: true
              }
            },
            subCategory: true,
            brand: true,
            itemDetails: true,
            itemPrice: {
              include: {
                warehouse: true,
              }
            }
          }
        });

          // Create price history record if price was created
          if (item.item_price) {
            await prisma.itemPriceHistory.create({
              data: {
                itemId: processedItem.id,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            });
          }
        } else {
          // Update existing item
          processedItem = await prisma.item.update({
            where: { id: existingItem.id },
            data: {
              isDisplayed: item.isDisplayed ?? existingItem.isDisplayed,
              itemImageLink: item.itemImageLink || existingItem.itemImageLink,
              sellCounter: item.sellCounter ?? existingItem.sellCounter,
              brandName: item.brandName || existingItem.brandName,
              warrantyType: item.warrantyType || existingItem.warrantyType,
              warrantyLength: item.warrantyLength ?? existingItem.warrantyLength,
              subCategoryId: item.subCategoryId || existingItem.subCategoryId,
              categoryId: item.categoryId || existingItem.categoryId,
              brandId: item.brandId || existingItem.brandId,
            },
            include: {
              category: {
                include: {
                  subCategories: true
                }
              },
              subCategory: true,
              brand: true,
              itemDetails: true,
              itemPrice: {
                include: {
                  warehouse: true,
                }
              }
            }
          });

        // Handle item price
        if (item.item_price) {
          const existingPrice = existingItem.itemPrice.find(
            price => price.warehouseId === item.item_price!.warehouseId
          );

          if (existingPrice) {
            // Update existing price
            await prisma.itemPrice.update({
              where: { id: existingPrice.id },
              data: {
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            });

            // Create price history record
            await prisma.itemPriceHistory.create({
              data: {
                itemId: existingItem.id,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            });
          } else {
            // Create new price
            await prisma.itemPrice.create({
              data: {
                itemId: existingItem.id,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            });

            // Create price history record
            await prisma.itemPriceHistory.create({
              data: {
                itemId: existingItem.id,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            });
          }
        }

        // Handle item details
        if (item.item_details) {
          const existingDetail = existingItem.itemDetails.find(
            detail => detail.locale === item.item_details!.locale
          );

          if (existingDetail) {
            // Update existing detail
            await prisma.itemDetails.update({
              where: { id: existingDetail.id },
              data: {
                itemName: item.item_details.itemName,
                description: item.item_details.description,
                specifications: item.item_details.specifications || null,
                seller: item.item_details.seller || null,
                discount: item.item_details.discount || null,
                popularity: item.item_details.popularity || null,
              }
            });
          } else {
            // Create new detail
            await prisma.itemDetails.create({
              data: {
                itemId: existingItem.id,
                locale: item.item_details.locale,
                itemName: item.item_details.itemName,
                description: item.item_details.description,
                specifications: item.item_details.specifications || null,
                seller: item.item_details.seller || null,
                discount: item.item_details.discount || null,
                popularity: item.item_details.popularity || null,
              }
            });
          }
        }

        // Fetch updated item with all relations
        processedItem = await prisma.item.findUnique({
          where: { id: existingItem.id },
          include: {
            category: {
              include: {
                subCategories: true
              }
            },
            subCategory: true,
            brand: true,
            itemDetails: true,
            itemPrice: {
              include: {
                warehouse: true,
              }
            }
          }
        }) as Item;
      }

      processedItems.push(processedItem);
    } catch (error) {
      console.error(`Error processing item ${item.articleId}:`, error);
      // Continue with next item instead of failing the entire batch
      continue;
    }
  }

  return processedItems;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();

    if (!fileExtension || !['csv', 'xlsx', 'xls', 'json'].includes(fileExtension)) {
      return NextResponse.json({
        error: 'Invalid file type. Only CSV, XLSX, XLS, and JSON files are supported.'
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'File too large. Maximum file size is 10MB.'
      }, { status: 400 });
    }

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = getParser(fileExtension);

    let parsedData;
    try {
      parsedData = await (fileExtension === 'csv'
        ? await parser(buffer)
        : parser(buffer));
    } catch (error: any) {
      return NextResponse.json({
        error: `Failed to parse file: ${error.message}`
      }, { status: 400 });
    }

    if (!parsedData || parsedData.length === 0) {
      return NextResponse.json({
        error: 'No valid data found in file'
      }, { status: 400 });
    }

    // Validate and resolve database references
    const referenceValidation = await validateAndResolveReferences(parsedData);
    if (!referenceValidation.isValid) {
      return NextResponse.json({
        error: 'Reference validation failed',
        details: referenceValidation.errors,
        invalidItems: referenceValidation.invalidItems
      }, { status: 400 });
    }

    // Process the items
    const parsedItems: BulkUploadItem[] = await convertUploadTypeToItems(parsedData);
    if (parsedItems.length === 0) {
      return NextResponse.json({
        error: 'No valid items to process after conversion'
      }, { status: 400 });
    }

    // Process bulk items using the new method
    const createdItems = await processBulkItems(parsedItems);

    if (createdItems.length === 0) {
      return NextResponse.json({
        error: 'No items were processed successfully'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      processedCount: createdItems.length,
      totalCount: parsedItems.length,
      createdItems
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
