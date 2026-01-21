// components/BrandsCarousel.tsx
"use client";
import React, { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/dist/client/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      slidesToScroll: 1,
    },
    [
      Autoplay({
        delay: 4000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  return (
    <section className="max-w-[70rem] mx-auto px-4">
      {isDataLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-gray-200"></div>
            </div>
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t("messages.noBrands")}
        </div>
      ) : (
        <div className="relative">
          {/* Carousel for all screen sizes */}
          <div className="embla overflow-hidden" ref={emblaRef}>
            <div className="embla__container flex gap-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="embla__slide flex-[0_0_calc(50%-0.5rem)] md:flex-[0_0_calc(20%-0.8rem)]"
                >
                  <Link href={`/categories?brand=${brand.id}`}>
                    <div className="bg-white overflow-hidden cursor-pointer">
                      <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-200">
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default BrandsCarousel;
