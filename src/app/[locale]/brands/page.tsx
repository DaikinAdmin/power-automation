import PageLayout from "@/components/layout/page-layout";
import PageSidebarNav from "@/components/static-pages/side-bar-nav";
import Link from "next/link";

interface Brand {
  alias: string;
  name: string;
  imageLink: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getBrands(): Promise<Brand[]> {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/public/brands`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return [];

    const data: Brand[] = await res.json();
    return data.filter((b) => b.isVisible);
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <PageSidebarNav />

          {/* Content */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Brands
            </h1>

            {brands.length === 0 ? (
              <p className="text-gray-500">No brands available</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {brands.map((brand) => (
                  <div
                    key={brand.alias}
                    className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-center hover:shadow-md transition cursor-pointer"
                  >
                    <Link href={`/ua/categories?brand=${brand.alias}`}>
                      <img
                        src={brand.imageLink}
                        alt={brand.name}
                        className="aspect-square object-contain"
                      />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
