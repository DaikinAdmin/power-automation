import { useState, useEffect } from "react";

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

      const data = (await response.json()) as any[];

      // Map API response to Category type
      const mappedCategories: Category[] = data.map((cat) => ({
        id: cat.slug,
        name: cat.name,
        slug: cat.slug,
        image: cat.imageLink || "/placeholder-category.jpg",
        subcategories: cat.subCategories?.map((sub: any) => ({
          name: sub.name,
          slug: sub.slug,
        })) || [],
      }));

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
