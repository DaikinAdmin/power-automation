import fs from 'fs';
import path from 'path';

const files = [
  'src/app/api/admin/warehouses/route.ts',
  'src/app/api/admin/warehouses/[warehouseId]/route.ts',
  'src/app/api/admin/discount-levels/route.ts',
  'src/app/api/admin/discount-levels/[id]/route.ts',
  'src/app/api/admin/banners/route.ts',
  'src/app/api/admin/banners/[id]/route.ts',
  'src/app/api/admin/orders/route.ts',
  'src/app/api/admin/orders/[id]/route.ts',
  'src/app/api/admin/items/route.ts',
  'src/app/api/admin/items/bulk-upload/route.ts',
  'src/app/api/admin/items/export/route.ts',
  'src/app/api/admin/items/[slug]/route.ts',
  'src/app/api/admin/items/[slug]/setVisible/route.ts',
  'src/app/api/admin/categories/route.ts',
  'src/app/api/admin/categories/[slug]/route.ts',
  'src/app/api/admin/currency-exchange/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/users/[id]/route.ts',
  'src/app/api/admin/pages/route.ts',
  'src/app/api/admin/pages/fix-content/route.ts',
  'src/app/api/admin/pages/[id]/route.ts',
  'src/app/api/user/role/[userId]/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/orders/[id]/route.ts',
];

function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  let modified = false;

  // Remove the headers import line
  if (content.includes("import { headers } from 'next/headers';")) {
    content = content.replace(/import { headers } from 'next\/headers';\n/g, '');
    modified = true;
  }

  // Replace headers: await headers() with headers: request.headers
  if (content.includes('headers: await headers()')) {
    content = content.replace(/headers:\s*await\s*headers\(\)/g, 'headers: request.headers');
    modified = true;
  }

  // Fix function signatures that don't use request parameter
  // Pattern 1: export async function METHOD() {
  const noParamPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\(\)\s*\{/g;
  if (noParamPattern.test(content)) {
    content = content.replace(
      /export async function (GET|POST|PUT|PATCH|DELETE)\(\)\s*\{/g,
      'export async function $1(request: NextRequest) {'
    );
    modified = true;
  }

  // Pattern 2: export async function METHOD(_request: NextRequest
  content = content.replace(
    /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*_request:\s*NextRequest/g,
    'export async function $1(request: NextRequest'
  );

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
  } else {
    console.log(`- Skipped: ${filePath} (no changes needed)`);
  }
}

console.log('Fixing headers imports in API routes...\n');

for (const file of files) {
  fixFile(file);
}

console.log('\nDone!');
