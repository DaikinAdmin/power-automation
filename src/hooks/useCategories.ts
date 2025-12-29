import { useState, useEffect } from "react";
import { ItemResponse } from "@/helpers/types/api-responses";

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: { name: string; slug: string }[];
};

export function useCategories(locale: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [locale]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/public/items/${locale}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = (await response.json()) as ItemResponse[];

      // Extract categories and subcategories from items
      const categoryMap = new Map<string, Category>();

      data.forEach((item: ItemResponse) => {
        if (item.category) {
          const categorySlug = item.category.slug;
          const categoryName = item.category.name;

          if (!categoryMap.has(categorySlug)) {
            categoryMap.set(categorySlug, {
              id: categorySlug,
              name: categoryName,
              slug: categorySlug,
              image: "/placeholder-category.jpg",
              subcategories: [],
            });
          }

          // Add subcategories from the category object
          const category = categoryMap.get(categorySlug)!;
          item.category.subCategories.forEach((sub) => {
            // Check if subcategory already exists to avoid duplicates
            if (!category.subcategories.some((s) => s.slug === sub.slug)) {
              category.subcategories.push({
                name: sub.name,
                slug: sub.slug,
              });
            }
          });
        }
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return { categories, isLoading, error, refetch: fetchCategories };
}
