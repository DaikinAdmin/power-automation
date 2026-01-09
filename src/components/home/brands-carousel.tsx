// components/BrandsCarousel.tsx
"use client";
import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

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


const BrandsCarousel: React.FC<BrandsCarouselProps> = ({
  brands,
  isDataLoading,
  t,
}) => {
  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      slidesToScroll: 1,
      dragFree: true,
      breakpoints: {
        "(min-width: 768px)": { dragFree: false },
      },
    },
    [
      Autoplay({
        delay: 4000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        // Only enable autoplay on mobile
        active: typeof window !== "undefined" ? window.innerWidth < 768 : true,
      }),
    ]
  );

  // Responsive: 2 slides on mobile, 5 on desktop
  const getSlideClass = () =>
    "embla__slide min-w-1/2 max-w-1/2 flex-shrink-0 md:min-w-0 md:max-w-none md:basis-1/5 px-1";

  return (
    <section className="max-w-[70rem] mx-auto">
      {isDataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-5">
          {[...Array(10)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-5 gap-5">
            {brands.slice(0, 10).map((brand) => (
              <div
                key={brand.id}
                className="bg-white overflow-hidden cursor-pointer"
              >
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-2">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-150"
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
          {/* Mobile embla carousel */}
          <div className="md:hidden">
            <div className="embla overflow-hidden" ref={emblaRef}>
              <div className="embla__container flex gap-2">
                {brands.slice(0, 10).map((brand) => (
                  <div
                    key={brand.id}
                    className="embla__slide flex-[0_0_calc(33.333%-0.5rem)]" // 3 елементи на рядок
                  >
                    <div className="bg-white overflow-hidden cursor-pointer">
                      <div className="aspect-square bg-gray-50 flex items-center justify-center p-2">
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {brands.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    {t("messages.noBrands")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default BrandsCarousel;
