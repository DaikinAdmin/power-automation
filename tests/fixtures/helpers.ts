import { test as base, expect } from '@playwright/test';

// Helper to create authenticated admin user
export async function createAuthenticatedRequest(request: any) {
  // This would need actual auth implementation
  // For now, return request with potential auth headers
  return request;
}

// Helper to validate JSON response
export function validateResponse(response: any, expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus);
  expect(response.headers()['content-type']).toContain('application/json');
}

// Helper to validate array response
export function validateArrayResponse(data: any, minLength: number = 0) {
  expect(Array.isArray(data)).toBeTruthy();
  expect(data.length).toBeGreaterThanOrEqual(minLength);
}

// Helper to validate pagination
export function validatePagination(data: any) {
  expect(data).toHaveProperty('items');
  expect(data).toHaveProperty('total');
  expect(data).toHaveProperty('page');
  expect(data).toHaveProperty('pageSize');
}

// Helper to validate error response
export function validateErrorResponse(data: any) {
  expect(data).toHaveProperty('error');
  expect(typeof data.error).toBe('string');
}

// Helper to validate category response
export function validateCategoryResponse(category: any) {
  expect(category).toHaveProperty('id');
  expect(category).toHaveProperty('name');
  expect(category).toHaveProperty('slug');
  expect(typeof category.id).toBe('string');
  expect(typeof category.name).toBe('string');
  expect(typeof category.slug).toBe('string');
}

// Helper to validate item response
export function validateItemResponse(item: any) {
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('articleId');
  expect(item).toHaveProperty('isDisplayed');
  expect(typeof item.id).toBe('string');
  expect(typeof item.articleId).toBe('string');
  expect(typeof item.isDisplayed).toBe('boolean');
}

// Helper to validate brand response
export function validateBrandResponse(brand: any) {
  expect(brand).toHaveProperty('id');
  expect(brand).toHaveProperty('name');
  expect(brand).toHaveProperty('alias');
  expect(typeof brand.id).toBe('string');
  expect(typeof brand.name).toBe('string');
  expect(typeof brand.alias).toBe('string');
}

// Helper to validate warehouse response
export function validateWarehouseResponse(warehouse: any) {
  expect(warehouse).toHaveProperty('id');
  expect(warehouse).toHaveProperty('name');
  expect(typeof warehouse.id).toBe('string');
  expect(typeof warehouse.name).toBe('string');
}

// Helper to validate order response
export function validateOrderResponse(order: any) {
  expect(order).toHaveProperty('id');
  expect(order).toHaveProperty('userId');
  expect(order).toHaveProperty('status');
  expect(order).toHaveProperty('totalPrice');
  expect(typeof order.id).toBe('string');
  expect(typeof order.userId).toBe('string');
  expect(typeof order.status).toBe('string');
}

export const test = base;
export { expect };
