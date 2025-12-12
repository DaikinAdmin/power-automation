#!/usr/bin/env tsx

import { parseExcelToJson, saveToJsonFile } from './excel-parser';
import * as path from 'path';
import * as fs from 'fs';

/**
 * CLI script to convert Excel file to JSON
 * 
 * Usage:
 *   npm run excel:to-json -- <excel-file-path> [output-json-path] [locale]
 *   
 * Examples:
 *   npm run excel:to-json -- ./data.xlsx
 *   npm run excel:to-json -- ./data.xlsx ./output.json ua
 *   npm run excel:to-json -- ./src/resources/data.xlsx ./parsed-data.json ua
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('\n❌ Error: Missing required argument\n');
    console.log('Usage:');
    console.log('  npm run excel:to-json -- <excel-file-path> [output-json-path] [locale]\n');
    console.log('Examples:');
    console.log('  npm run excel:to-json -- ./data.xlsx');
    console.log('  npm run excel:to-json -- ./data.xlsx ./output.json ua');
    console.log('  npm run excel:to-json -- ./src/resources/data.xlsx ./parsed-data.json ua\n');
    process.exit(1);
  }
  
  const [excelFilePath, outputJsonPath, locale = 'ua'] = args;
  
  // Resolve file path
  const absoluteExcelPath = path.isAbsolute(excelFilePath)
    ? excelFilePath
    : path.resolve(process.cwd(), excelFilePath);
  
  // Check if file exists
  if (!fs.existsSync(absoluteExcelPath)) {
    console.error(`\n❌ Error: File not found: ${absoluteExcelPath}\n`);
    process.exit(1);
  }
  
  // Check if file is Excel
  if (!absoluteExcelPath.match(/\.(xlsx|xls)$/i)) {
    console.error(`\n❌ Error: File must be an Excel file (.xlsx or .xls)\n`);
    process.exit(1);
  }
  
  // Determine output path
  let absoluteOutputPath: string;
  if (outputJsonPath) {
    absoluteOutputPath = path.isAbsolute(outputJsonPath)
      ? outputJsonPath
      : path.resolve(process.cwd(), outputJsonPath);
  } else {
    // Default: same directory and name as input file, but with .json extension
    const dir = path.dirname(absoluteExcelPath);
    const filename = path.basename(absoluteExcelPath, path.extname(absoluteExcelPath));
    absoluteOutputPath = path.join(dir, `${filename}-parsed.json`);
  }
  
  try {
    console.log('\n📊 Converting Excel to JSON...\n');
    console.log(`📄 Input:  ${absoluteExcelPath}`);
    console.log(`📝 Output: ${absoluteOutputPath}`);
    console.log(`🌍 Locale: ${locale}\n`);
    
    const parsedData = parseExcelToJson(absoluteExcelPath, locale);
    
    console.log(`✓ Found ${parsedData.items.length} items`);
    console.log(`✓ Found ${parsedData.brands.size} unique brands`);
    console.log(`✓ Found ${parsedData.categories.size} unique categories`);
    console.log(`✓ Found ${parsedData.subcategories.size} unique subcategories\n`);
    
    saveToJsonFile(parsedData, absoluteOutputPath);
    
    console.log('\n✅ Conversion completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Conversion failed:', error);
    process.exit(1);
  }
}

main();
