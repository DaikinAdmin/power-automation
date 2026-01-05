import { useState, useEffect } from "react";
import { CategoryResponse } from "@/helpers/types/api-responses";

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
      const response = await fetch(`/api/public/categories/${locale}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = (await response.json()) as CategoryResponse[];
      
      console.log('📦 Fetched categories from API:', data);
      console.log('🔍 First category imageLink:', data[0]?.imageLink);

      // Map CategoryResponse to Category type
      const mappedCategories: Category[] = data.map((cat) => {
        console.log(`🏷️ Mapping category: ${cat.slug}, imageLink: ${cat.imageLink}`);
        
        return {
          id: cat.slug,
          name: cat.name,
          slug: cat.slug,
          image: cat.imageLink || "/placeholder-category.jpg",
          subcategories: cat.subCategories.map((sub) => ({
            name: sub.name,
            slug: sub.slug,
          })),
        };
      });

      console.log('✅ Mapped categories:', mappedCategories);
      setCategories(mappedCategories);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return { categories, isLoading, error, refetch: fetchCategories };
}
