"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerData {
  id?: string;
  src: string;
  alt: string;
  href?: string;
  priority?: boolean;
}

interface BannersConfig {
  desktop: BannerData[];
  mobile: BannerData[];
}

interface CarouselProps {
  banners: BannersConfig;
}

const Carousel: React.FC<CarouselProps> = ({ banners }) => {
  const autoplay = Autoplay({ delay: 6000, stopOnInteraction: false });
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade(), autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get the appropriate banner list
  const activeBanners = isMobile ? banners.mobile : banners.desktop;

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi]
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  return (
    <div className="relative w-full h-40 md:h-[560px] overflow-hidden">
      {/* Carousel viewport */}
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {activeBanners.map((banner, idx) => {
            const content = (
              <div className="relative w-full h-full cursor-pointer">
                <Image
                  src={banner.src}
                  alt={banner.alt}
                  fill
                  priority={banner.priority}
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            );

            return (
              <div key={banner.id || `banner-${idx}`} className="flex-[0_0_100%] h-full relative">
                {banner.href ? (
                  <Link href={banner.href} className="block h-full w-full">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-2 rounded-full"
      >
        <ChevronLeft size={24} className="text-white" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-2 rounded-full"
      >
        <ChevronRight size={24} className="text-white" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-2 absolute bottom-4 left-1/2 -translate-x-1/2">
        {activeBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-3 h-3 rounded-full transition-colors border-2 border-white ${
              index === selectedIndex ? "bg-red-600" : "bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
