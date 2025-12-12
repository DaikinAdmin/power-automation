import { NextRequest, NextResponse } from 'next/server';
import { getParser } from '@/lib/file-parsers';
import { validateAndResolveReferences } from '@/lib/validation/bulk-item-validator';
import { convertUploadTypeToItems } from '@/helpers/converters/uploadTypeConverter';
// import prisma from '@/db';
import { db } from '@/db';
import { BulkUploadItem, Item } from '@/helpers/types/item';
import { Badge } from '@prisma/client';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

async function processBulkItems(items: BulkUploadItem[]): Promise<Item[]> {
  const processedItems: Item[] = [];

  for (const item of items) {
    try {
      // Drizzle implementation - Check if item exists
      const [existingItem] = await db
        .select()
        .from(schema.item)
        .where(eq(schema.item.articleId, item.articleId))
        .limit(1);

      const existingItemDetails = existingItem
        ? await db.select().from(schema.itemDetails).where(eq(schema.itemDetails.itemSlug, existingItem.articleId))
        : [];

      const existingItemPrices = existingItem
        ? await db.select({
            id: schema.itemPrice.id,
            itemId: schema.itemPrice.itemId,
            itemSlug: schema.itemPrice.itemSlug,
            warehouseId: schema.itemPrice.warehouseId,
            price: schema.itemPrice.price,
            quantity: schema.itemPrice.quantity,
            promotionPrice: schema.itemPrice.promotionPrice,
            promoEndDate: schema.itemPrice.promoEndDate,
            promoCode: schema.itemPrice.promoCode,
            badge: schema.itemPrice.badge,
            createdAt: schema.itemPrice.createdAt,
            updatedAt: schema.itemPrice.updatedAt,
            warehouse: schema.warehouse,
          })
          .from(schema.itemPrice)
          .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
          .where(eq(schema.itemPrice.itemSlug, existingItem.articleId))
        : [];

      /* Prisma implementation (commented out)
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
      */

      let processedItem: any;

      if (!existingItem) {
        // Drizzle implementation - Create new item
        const itemId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Determine categorySlug using new logic
        let finalCategorySlug = item.categorySlug;
        if (item.subCategorySlug) {
          // Use subcategory slug as categorySlug
          finalCategorySlug = item.subCategorySlug;
        }

        const [newItem] = await db
          .insert(schema.item)
          .values({
            id: itemId,
            articleId: item.articleId,
            isDisplayed: item.isDisplayed ?? false,
            itemImageLink: item.itemImageLink || null,
            sellCounter: item.sellCounter || 0,
            categorySlug: finalCategorySlug || null,
            subCategorySlug: null, // Always null with new logic
            brandSlug: item.brandSlug || null,
            warrantyType: item.warrantyType || null,
            warrantyLength: item.warrantyLength || null,
            linkedItems: [],
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        // Create item details if provided
        if (item.item_details) {
          await db.insert(schema.itemDetails).values({
            id: crypto.randomUUID(),
            itemSlug: newItem.articleId,
            locale: item.item_details.locale,
            itemName: item.item_details.itemName,
            description: item.item_details.description,
            specifications: item.item_details.specifications || null,
            seller: item.item_details.seller || null,
            discount: item.item_details.discount ?? null,
            popularity: item.item_details.popularity ?? null,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Create item price if provided
        if (item.item_price) {
          await db.insert(schema.itemPrice).values({
            id: crypto.randomUUID(),
            itemId: newItem.id,
            itemSlug: newItem.articleId,
            warehouseId: item.item_price.warehouseId,
            price: item.item_price.price,
            quantity: item.item_price.quantity,
            promotionPrice: item.item_price.promotionPrice || null,
            promoEndDate: item.item_price.promoEndDate ? new Date(item.item_price.promoEndDate).toISOString() : null,
            promoCode: item.item_price.promoCode || null,
            badge: (item.item_price.badge as Badge) || Badge.ABSENT,
            createdAt: now,
            updatedAt: now,
          });

          // Create price history record
          await db.insert(schema.itemPriceHistory).values({
            id: crypto.randomUUID(),
            itemId: newItem.id,
            warehouseId: item.item_price.warehouseId,
            price: item.item_price.price,
            quantity: item.item_price.quantity,
            promotionPrice: item.item_price.promotionPrice || null,
            promoEndDate: item.item_price.promoEndDate ? new Date(item.item_price.promoEndDate).toISOString() : null,
            promoCode: item.item_price.promoCode || null,
            badge: (item.item_price.badge as Badge) || Badge.ABSENT,
            createdAt: now,
            updatedAt: now,
          });
        }

        processedItem = newItem;

        /* Prisma implementation (commented out)
        processedItem = await prisma.item.create({
          data: {
            articleId: item.articleId,
            isDisplayed: item.isDisplayed ?? false,
            itemImageLink: item.itemImageLink || null,
            sellCounter: item.sellCounter || 0,
            category: { connect: { slug: item.categorySlug } },
            subCategory: { connect: { slug: item.subCategorySlug } },
            brand: item.brandId ? { connect: { id: item.brandId } } : undefined,
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
                subCategories: true,
                categoryTranslations: true
              }
            },
            subCategory: {
              include: {
                subCategoryTranslations: true
              }
            },
            brand: true,
            itemDetails: true,
            itemPrice: {
              include: {
                warehouse: true,
              }
            }
          }
        });

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
        */
        } else {
          // Drizzle implementation - Update existing item
          const now = new Date().toISOString();

          // Determine categorySlug using new logic
          let finalCategorySlug = item.categorySlug || existingItem.categorySlug;
          if (item.subCategorySlug) {
            finalCategorySlug = item.subCategorySlug;
          }

          const [updatedItem] = await db
            .update(schema.item)
            .set({
              isDisplayed: item.isDisplayed ?? existingItem.isDisplayed,
              itemImageLink: item.itemImageLink || existingItem.itemImageLink,
              sellCounter: item.sellCounter ?? existingItem.sellCounter,
              warrantyType: item.warrantyType || existingItem.warrantyType,
              warrantyLength: item.warrantyLength ?? existingItem.warrantyLength,
              categorySlug: finalCategorySlug,
              subCategorySlug: null, // Always null with new logic
              brandSlug: item.brandSlug || existingItem.brandSlug,
              updatedAt: now,
            })
            .where(eq(schema.item.id, existingItem.id))
            .returning();

          // Handle item price
          if (item.item_price) {
            const existingPrice = existingItemPrices.find(
              (price) => price.warehouseId === item.item_price!.warehouseId
            );

            if (existingPrice) {
              // Update existing price
              await db
                .update(schema.itemPrice)
                .set({
                  price: item.item_price.price,
                  quantity: item.item_price.quantity,
                  promotionPrice: item.item_price.promotionPrice || null,
                  promoEndDate: item.item_price.promoEndDate ? new Date(item.item_price.promoEndDate).toISOString() : null,
                  promoCode: item.item_price.promoCode || null,
                  badge: (item.item_price.badge as Badge) || Badge.ABSENT,
                  updatedAt: now,
                })
                .where(eq(schema.itemPrice.id, existingPrice.id));

              // Create price history record
              await db.insert(schema.itemPriceHistory).values({
                id: crypto.randomUUID(),
                itemId: existingItem.id,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate ? new Date(item.item_price.promoEndDate).toISOString() : null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
                createdAt: now,
                updatedAt: now,
              });
            } else {
              // Create new price
              await db.insert(schema.itemPrice).values({
                id: crypto.randomUUID(),
                itemId: existingItem.id,
                itemSlug: existingItem.articleId,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate ? new Date(item.item_price.promoEndDate).toISOString() : null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
                createdAt: now,
                updatedAt: now,
              });

              // Create price history record
              await db.insert(schema.itemPriceHistory).values({
                id: crypto.randomUUID(),
                itemId: existingItem.id,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate ? new Date(item.item_price.promoEndDate).toISOString() : null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
                createdAt: now,
                updatedAt: now,
              });
            }
          }

        /* Prisma implementation (commented out)
        processedItem = await prisma.item.update({
          where: { id: existingItem.id },
          data: {
            isDisplayed: item.isDisplayed ?? existingItem.isDisplayed,
            itemImageLink: item.itemImageLink || existingItem.itemImageLink,
            sellCounter: item.sellCounter ?? existingItem.sellCounter,
            warrantyType: item.warrantyType || existingItem.warrantyType,
            warrantyLength: item.warrantyLength ?? existingItem.warrantyLength,
            subCategorySlug: item.subCategorySlug || existingItem.subCategorySlug,
            categorySlug: item.categorySlug || existingItem.categorySlug,
            brandSlug: item.brandSlug || existingItem.brandSlug,
          },
          include: {
            category: {
              include: {
                subCategories: true,
                categoryTranslations: true
              }
            },
            subCategory: {
              include: {
                subCategoryTranslations: true
              }
            },
            brand: true,
            itemDetails: true,
            itemPrice: {
              include: {
                warehouse: true,
              }
            }
          }
        });

        if (item.item_price) {
          const existingPrice = existingItem.itemPrice.find(
            (price: { warehouseId: string }) => price.warehouseId === item.item_price!.warehouseId
          );

          if (existingPrice) {
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
            await prisma.itemPrice.create({
              data: {
                itemSlug: existingItem.articleId,
                warehouseId: item.item_price.warehouseId,
                price: item.item_price.price,
                quantity: item.item_price.quantity,
                promotionPrice: item.item_price.promotionPrice || null,
                promoEndDate: item.item_price.promoEndDate || null,
                promoCode: item.item_price.promoCode || null,
                badge: (item.item_price.badge as Badge) || Badge.ABSENT,
              }
            });

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
        */

        // Handle item details
        if (item.item_details) {
          const existingDetail = existingItemDetails.find(
            (detail) => detail.locale === item.item_details!.locale
          );

          if (existingDetail) {
            // Update existing detail
            await db
              .update(schema.itemDetails)
              .set({
                itemName: item.item_details.itemName,
                description: item.item_details.description,
                specifications: item.item_details.specifications || null,
                seller: item.item_details.seller || null,
                discount: item.item_details.discount ?? null,
                popularity: item.item_details.popularity ?? null,
                updatedAt: now,
              })
              .where(eq(schema.itemDetails.id, existingDetail.id));
          } else {
            // Create new detail
            await db.insert(schema.itemDetails).values({
              id: crypto.randomUUID(),
              itemSlug: existingItem.articleId,
              locale: item.item_details.locale,
              itemName: item.item_details.itemName,
              description: item.item_details.description,
              specifications: item.item_details.specifications || null,
              seller: item.item_details.seller || null,
              discount: item.item_details.discount ?? null,
              popularity: item.item_details.popularity ?? null,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        // Fetch updated item
        const [refetchedItem] = await db
          .select()
          .from(schema.item)
          .where(eq(schema.item.id, existingItem.id))
          .limit(1);

        processedItem = refetchedItem;

        /* Prisma implementation (commented out)
        if (item.item_details) {
          const existingDetail = existingItem.itemDetails.find(
            (detail: { locale: string }) => detail.locale === item.item_details!.locale
          );

          if (existingDetail) {
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
            await prisma.itemDetails.create({
              data: {
                itemSlug: existingItem.articleId,
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
        */
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
