import { relations } from "drizzle-orm/relations";
import { warehouse, itemPrice, item, warehouseCountries, user, session, account, twoFactor, brand, category, subcategories, cart, itemOpinion, messages, order, outOfStockRequest, itemDetails, itemPriceHistory, linkedItems, categoryTranslation, subcategoryTranslation, itemToOrder, cartToItem, discountLevel, discountLevelToUser, itemPriceToItemPriceHistory } from "./schema";

export const itemPriceRelations = relations(itemPrice, ({one, many}) => ({
	warehouse: one(warehouse, {
		fields: [itemPrice.warehouseId],
		references: [warehouse.id]
	}),
	item: one(item, {
		fields: [itemPrice.itemSlug],
		references: [item.articleId]
	}),
	itemPriceToItemPriceHistories: many(itemPriceToItemPriceHistory),
}));

export const warehouseRelations = relations(warehouse, ({one, many}) => ({
	itemPrices: many(itemPrice),
	warehouseCountry: one(warehouseCountries, {
		fields: [warehouse.countrySlug],
		references: [warehouseCountries.slug]
	}),
	outOfStockRequests: many(outOfStockRequest),
	itemPriceHistories: many(itemPriceHistory),
}));

export const itemRelations = relations(item, ({one, many}) => ({
	itemPrices: many(itemPrice),
	brand: one(brand, {
		fields: [item.brandSlug],
		references: [brand.alias]
	}),
	itemOpinions: many(itemOpinion),
	outOfStockRequests: many(outOfStockRequest),
	itemDetails: many(itemDetails),
	itemPriceHistories: many(itemPriceHistory),
	linkedItems: many(linkedItems),
	itemToOrders: many(itemToOrder),
	cartToItems: many(cartToItem),
}));

export const warehouseCountriesRelations = relations(warehouseCountries, ({many}) => ({
	warehouses: many(warehouse),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
	twoFactors: many(twoFactor),
	carts: many(cart),
	itemOpinions: many(itemOpinion),
	messages: many(messages),
	orders: many(order),
	discountLevelToUsers: many(discountLevelToUser),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const twoFactorRelations = relations(twoFactor, ({one}) => ({
	user: one(user, {
		fields: [twoFactor.userId],
		references: [user.id]
	}),
}));

export const brandRelations = relations(brand, ({many}) => ({
	items: many(item),
}));

export const subcategoriesRelations = relations(subcategories, ({one, many}) => ({
	category: one(category, {
		fields: [subcategories.categorySlug],
		references: [category.id]
	}),
	subcategoryTranslations: many(subcategoryTranslation),
}));

export const categoryRelations = relations(category, ({many}) => ({
	subcategories: many(subcategories),
	categoryTranslations: many(categoryTranslation),
}));

export const cartRelations = relations(cart, ({one, many}) => ({
	user: one(user, {
		fields: [cart.userId],
		references: [user.id]
	}),
	cartToItems: many(cartToItem),
}));

export const itemOpinionRelations = relations(itemOpinion, ({one}) => ({
	user: one(user, {
		fields: [itemOpinion.userId],
		references: [user.id]
	}),
	item: one(item, {
		fields: [itemOpinion.itemId],
		references: [item.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	user: one(user, {
		fields: [messages.userId],
		references: [user.id]
	}),
	order: one(order, {
		fields: [messages.orderId],
		references: [order.id]
	}),
}));

export const orderRelations = relations(order, ({one, many}) => ({
	messages: many(messages),
	user: one(user, {
		fields: [order.userId],
		references: [user.id]
	}),
	itemToOrders: many(itemToOrder),
}));

export const outOfStockRequestRelations = relations(outOfStockRequest, ({one}) => ({
	item: one(item, {
		fields: [outOfStockRequest.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, {
		fields: [outOfStockRequest.warehouseId],
		references: [warehouse.id]
	}),
}));

export const itemDetailsRelations = relations(itemDetails, ({one}) => ({
	item: one(item, {
		fields: [itemDetails.itemSlug],
		references: [item.articleId]
	}),
}));

export const itemPriceHistoryRelations = relations(itemPriceHistory, ({one, many}) => ({
	item: one(item, {
		fields: [itemPriceHistory.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, {
		fields: [itemPriceHistory.warehouseId],
		references: [warehouse.id]
	}),
	itemPriceToItemPriceHistories: many(itemPriceToItemPriceHistory),
}));

export const linkedItemsRelations = relations(linkedItems, ({one}) => ({
	item: one(item, {
		fields: [linkedItems.itemSlug],
		references: [item.articleId]
	}),
}));

export const categoryTranslationRelations = relations(categoryTranslation, ({one}) => ({
	category: one(category, {
		fields: [categoryTranslation.categorySlug],
		references: [category.id]
	}),
}));

export const subcategoryTranslationRelations = relations(subcategoryTranslation, ({one}) => ({
	subcategory: one(subcategories, {
		fields: [subcategoryTranslation.subCategorySlug],
		references: [subcategories.id]
	}),
}));

export const itemToOrderRelations = relations(itemToOrder, ({one}) => ({
	item: one(item, {
		fields: [itemToOrder.a],
		references: [item.id]
	}),
	order: one(order, {
		fields: [itemToOrder.b],
		references: [order.id]
	}),
}));

export const cartToItemRelations = relations(cartToItem, ({one}) => ({
	cart: one(cart, {
		fields: [cartToItem.a],
		references: [cart.id]
	}),
	item: one(item, {
		fields: [cartToItem.b],
		references: [item.id]
	}),
}));

export const discountLevelToUserRelations = relations(discountLevelToUser, ({one}) => ({
	discountLevel: one(discountLevel, {
		fields: [discountLevelToUser.a],
		references: [discountLevel.id]
	}),
	user: one(user, {
		fields: [discountLevelToUser.b],
		references: [user.id]
	}),
}));

export const discountLevelRelations = relations(discountLevel, ({many}) => ({
	discountLevelToUsers: many(discountLevelToUser),
}));

export const itemPriceToItemPriceHistoryRelations = relations(itemPriceToItemPriceHistory, ({one}) => ({
	itemPrice: one(itemPrice, {
		fields: [itemPriceToItemPriceHistory.a],
		references: [itemPrice.id]
	}),
	itemPriceHistory: one(itemPriceHistory, {
		fields: [itemPriceToItemPriceHistory.b],
		references: [itemPriceHistory.id]
	}),
}));