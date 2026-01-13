import Link from "next/link";
import { useTranslations } from "next-intl";

interface CategoryBreadcrumbProps {
  locale: string;
  categoryName: string;
}

export function CategoryBreadcrumb({
  locale,
  categoryName,
}: CategoryBreadcrumbProps) {
  const t = useTranslations("categories");

  return (
    <div className="mb-6 overflow-x-auto">
      <nav className="flex items-center space-x-2 text-sm text-gray-600 whitespace-nowrap">
        <Link
          href={`/${locale}`}
          className="hover:text-blue-600 transition-colors"
        >
          {t("breadcrumb.home")}
        </Link>
        <span>/</span>
        <Link
          href={`/${locale}/categories`}
          className="hover:text-blue-600 transition-colors"
        >
          {t("breadcrumb.allCategories")}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{categoryName}</span>
      </nav>
    </div>
  );
}
