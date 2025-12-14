'use server';

import { db } from "@/db";
import { outOfStockRequest } from "@/db/schema";
import { getUserCountry } from "./location";

// interface WarehousePrice {
//   id: string;
//   warehouseId: string;
//   displayedName: string;
//   price: string;
//   specialPrice?: string;
//   originalPrice?: string;
//   quantity: number;
//   inStock: boolean;
// }

// export interface ProductWithWarehouses {
//   id: string;
//   articleId: string;
//   name: string;
//   image: string;
//   badge?: 'bestseller' | 'discount' | 'new';
//   category: string;
//   categorySlug: string;
//   subcategory: string;
//   description: string;
//   warrantyMonths: number;
//   warehouses: WarehousePrice[];
//   recommendedWarehouse?: WarehousePrice;
// }

// export async function getProductById(id: string): Promise<ProductWithWarehouses | null> {
//   try {
//     const userCountry = await getUserCountry();

//     const item = await db.item.findFirst({
//       where: {
//         id: id,
//         isDisplayed: true
//       },
//       include: {
//         itemDetails: {
//           where: {
//             locale: 'pl'
//           },
//         },
//         itemPrice: {
//           include: {
//             warehouse: true
//           },
//           where: {
//             warehouse: {
//               isVisible: true
//             }
//           }
//         },
//         category: true,
//         subCategory: true
//       }
//     });

//     if (!item || !item.itemDetails.length || !item.itemPrice.length) {
//       return null;
//     }

//     const itemDetails = item.itemDetails[0];
//     const category = item.category;

//     // Process all warehouses with better sorting
//     const warehouses: WarehousePrice[] = item.itemPrice
//       .map(price => ({
//         id: price.id,
//         warehouseId: price.warehouseId,
//         displayedName: price.warehouse.displayedName,
//         price: `${price.price} €`,
//         specialPrice: price.promotionPrice ? `${price.promotionPrice} €` : undefined,
//         originalPrice: price.promotionPrice ? `${price.price} €` : undefined,
//         quantity: price.quantity,
//         inStock: price.quantity > 0
//       }))
//     // Sort by: user country with stock first, then user country, then other countries with stock, then others

//     // Find recommended warehouse (user's country with stock preferred)
//     const recommendedWarehouse = warehouses.find(w => w.inStock) || warehouses[0];

//     const product: ProductWithWarehouses = {
//       id: item.articleId,
//       articleId: item.articleId,
//       name: itemDetails.itemName,
//       image: item.itemImageLink || "/placeholder-product.jpg",
//       badge: itemDetails.badge === 'NEW_ARRIVALS' ? 'new' as const :
//         itemDetails.badge === 'BESTSELLER' ? 'bestseller' as const :
//           itemDetails.badge === 'HOT_DEALS' ? 'discount' as const :
//             undefined,
//       category: category?.name || "Uncategorized",
//       categorySlug: category?.slug || "uncategorized",
//       subcategory: item.subCategory.name || "General",
//       description: itemDetails.description,
//       warrantyMonths: itemDetails.warrantyLength || 12,
//       warehouses,
//       recommendedWarehouse
//     };

//     return product;
//   } catch (error) {
//     console.error('Error fetching product:', error);
//     return null;
//   }
// }

export async function requestOutOfStockItem(itemId: string, warehouseId: string, userEmail: string, message: string, userName?: string) {
  try {
    const { nanoid } = await import('nanoid');
    const now = new Date().toISOString();
    
    // Store the request in database
    await db.insert(outOfStockRequest).values({
      id: nanoid(),
      itemId,
      warehouseId,
      userEmail,
      userName: userName || 'Anonymous',
      message,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    });

    // console.log('Out of stock request stored:', {
    //   itemId,
    //   warehouseId,
    //   userEmail,
    //   message,
    //   timestamp: new Date()
    // });

    return { success: true };
  } catch (error) {
    console.error('Error requesting out of stock item:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}

// export async function getProductsByCategory(categorySlug: string, userCountry?: string, locale: string = 'pl'): Promise<ProductWithWarehouses[]> {
//   try {
//     const currentUserCountry = userCountry || await getUserCountry();

//     const items = await db.item.findMany({
//       where: {
//         isDisplayed: true,
//       },
//       include: {
//         itemDetails: {
//           where: {
//             locale: locale
//           },
//         },
//         itemPrice: {
//           include: {
//             warehouse: true
//           },
//           where: {
//             warehouse: {
//               isVisible: true
//             }
//           }
//         },
//         category: true,
//         subCategory: true
//       }
//     });

//     return items.map(item => {
//       const itemDetails = item.itemDetails[0];
//       const category = item.category;

//       // Get warehouses prioritized by user location
//       const warehouses: WarehousePrice[] = item.itemPrice
//         .map(price => ({
//           id: price.id,
//           articleId: item.articleId,
//           warehouseId: price.warehouseId,
//           displayedName: price.warehouse.displayedName,
//           warehouseCountry: price.warehouse.country,
//           price: `${price.price} €`,
//           specialPrice: price.promotionPrice ? `${price.promotionPrice} €` : undefined,
//           originalPrice: price.promotionPrice ? `${price.price} €` : undefined,
//           quantity: price.quantity,
//           inStock: price.quantity > 0
//         }))
//         .sort((a, b) => {
//           const aUserCountry = a.warehouseCountry === currentUserCountry;
//           const bUserCountry = b.warehouseCountry === currentUserCountry;

//           if (aUserCountry && bUserCountry) return b.quantity - a.quantity;
//           if (aUserCountry && !bUserCountry) return -1;
//           if (!aUserCountry && bUserCountry) return 1;

//           if (a.inStock && !b.inStock) return -1;
//           if (!a.inStock && b.inStock) return 1;

//           return b.quantity - a.quantity;
//         });

//       // Find recommended warehouse (user's country with stock preferred)
//       const recommendedWarehouse = warehouses.find(w => w.inStock) || warehouses[0];

//       return {
//         id: item.articleId,
//         articleId: item.articleId,
//         name: itemDetails?.itemName ?? "Unnamed Product",
//         image: item.itemImageLink || "/placeholder-product.jpg",
//         badge: itemDetails?.badge === 'NEW_ARRIVALS' ? 'new' as const :
//           itemDetails?.badge === 'BESTSELLER' ? 'bestseller' as const :
//             itemDetails?.badge === 'HOT_DEALS' ? 'discount' as const :
//               undefined,
//         category: category?.name || "Uncategorized",
//         categorySlug: category?.slug || "uncategorized",
//         subcategory: item?.subCategory.name || "General",
//         description: itemDetails?.description ?? "",
//         warrantyMonths: itemDetails?.warrantyLength ?? 12,
//         warehouses,
//         recommendedWarehouse
//       };
//     });
//   } catch (error) {
//     console.error('Error fetching products by category:', error);
//     return [];
//   }
// }
