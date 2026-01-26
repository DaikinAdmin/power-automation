const fs = require('fs');
const path = require('path');

// Patch better-auth to fix Next.js 16 compatibility
const betterAuthNextPath = path.join(
  __dirname,
  '../node_modules/better-auth/dist/integrations/next-js.mjs'
);

if (fs.existsSync(betterAuthNextPath)) {
  let content = fs.readFileSync(betterAuthNextPath, 'utf8');
  
  // Replace imports from 'next/headers' to 'next/headers.js'
  content = content.replace(
    /from\s+['"]next\/headers['"]/g,
    'from "next/headers.js"'
  );
  
  fs.writeFileSync(betterAuthNextPath, content, 'utf8');
  console.log('✅ Patched better-auth for Next.js 16 compatibility');
} else {
  console.log('⚠️ better-auth not found, skipping patch');
}
