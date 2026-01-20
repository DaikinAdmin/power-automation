# Actual Excel Column Mapping

Based on analysis of the data.xlsx file, here is the **actual** column structure:

| Column | Index | Field | Description |
|--------|-------|-------|-------------|
| A | 0 | articleId | Product article number |
| B | 1 | ? | (numeric value) |
| C | 2 | price (UAH) | Price in UAH with VAT |
| D | 3 | price (EUR) | Price in EUR |
| F | 5 | slug | URL slug |
| G | 6 | variant_name | Product variant name (UA) |
| H | 7 | itemName | Full product name (UA) |
| I | 8 | brandName | Brand name |
| J | 9 | categoryName | Category section |
| K | 10 | price_field | (usually empty) |
| L | 11 | old_price | Old price |
| M | 12 | currency | Currency code |
| N | 13 | isDisplayed | Display status (Да/Нет) |
| O | 14 | availability | Stock availability status |
| P | 15 | subcategoryName | Additional sections/subcategory |
| Q | 16 | images | Photo/images (comma-separated) |
| R | 17 | gallery | Gallery images |
| X | 23 | metaKeywords | SEO keywords |
| Y | 24 | metaDescription | META description |
| [ | 26 | seller | Supplier name |
| _ | 30 | quantity | Stock quantity |
| ` | 31 | description | Product description (UA) |

## Notes

- The Excel uses a mix of Ukrainian and Russian headers
- **Price**: The main price should be taken from column C (UAH) or D (EUR)
- **isDisplayed**: Uses "Да" (Yes) / "Нет" (No) in Russian/Ukrainian
- **Quantity**: Column _ (30) contains the stock quantity
- **Images**: Column Q (16) may contain comma-separated image URLs
- **Currency**: Column M (12) indicates the currency (EUR, UAH, PLN)

## Mapping Update Needed

The parser has been updated to use:
- Column C (2) for EUR price
- Column H (7) for item name
- Column I (8) for brand
- Column J (9) for category
- Column P (15) for subcategory
- Column N (13) for display status (Да = true)
- Column _ (30) for quantity
- Column [ (26) for seller
- Column ` (31) for description
- Column Y (24) for specifications/meta description
- Column X (23) for meta keywords
