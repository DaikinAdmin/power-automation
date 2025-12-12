// components/BrandsCarousel.tsx
import React from "react";

interface Brand {
  id: number | string;
  name: string;
  logo: string;
}

interface BrandsCarouselProps {
  brands: Brand[];
  isDataLoading: boolean;
  t: (key: string) => string;
}

const BrandsCarousel: React.FC<BrandsCarouselProps> = ({ brands, isDataLoading, t }) => {
  return (
    <section className="max-w-[70rem] mx-auto">
      {/* <h2 className="text-3xl font-bold text-center mb-8">{t("sections.brands")}</h2> */}
      
      {isDataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(10)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-5 gap-5">
          {brands.slice(0, 10).map((brand) => (
            <div key={brand.id} className="bg-white overflow-hidden cursor-pointer">
              <div className="aspect-square bg-gray-50 flex items-center justify-center p-2">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
            </div>
          ))}

          {brands.length === 0 && (
            <div className="col-span-6 text-center py-8 text-gray-500">
              {t("messages.noBrands")}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default BrandsCarousel;
