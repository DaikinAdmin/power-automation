Let's start from MAPPING:
- Column A: item.articleId
- Column D: item.itemDetails.itemName (depends on locale, in the file locale is 'ua')
- Column F: item.slug
- Column G: brand.name
- Column H: category.name (parent category)
- Column I: subCategory.name (if applicable)
- Column J: item.itemPrice.price
- Column M: item.isDisplayed
- Column N: item.itemPrice.quantity
- Column O: item.itemImageLink (create an array of images if multiple divided by commas)
- Column P: item.itemDetails.seller
- Column Q: item.itemDetails.description (depends on locale, in the file locale is 'ua')
- Column R: item.itemDetails.specifications (depends on locale, in the file locale is 'ua')
- Column U: item.itemDetails.metaKeywords (depends on locale, in the file locale is 'ua')
- Column V: item.itemDetails.metaDescription (depends on locale, in the file locale is 'ua')

Please create a script to process the provided Excel file and populate the database accordingly and create a method to convert this type of xls document to JSON object.

You need to create a new item entry in the database for each row in the Excel file, mapping the columns as specified above. Make sure to handle locale-specific fields appropriately (translate columns D, Q, R, U, V).

In the meantime, please find:
- in column G brands and fill the Brand table if there are any new brands that do not exist in the database yet.
- in column H categories and fill the Category table if there are any new categories that do not exist in the database yet. Translate category name to English if the name in column H is not in English, and add translations to CategoryTranslation table.
- in column I subcategories and fill the SubCategory table if there are any new subcategories that do not exist in the database yet. Make sure to link each subcategory to its parent category. Translate subcategory name to English if the name in column I is not in English, and add translations to SubCategoryTranslation table.
- Make sure to link each item to its corresponding brand, category, and subcategory (if applicable) using foreign keys.