"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";

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
  position?: string;
  banners?: BannersConfig;
}

interface ApiBanner {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  device: string;
  locale: string;
  sortOrder: number | null;
  isActive: boolean | null;
}

const Carousel: React.FC<CarouselProps> = ({ position = 'home_top', banners: fallbackBanners }) => {
  const locale = useLocale();
  const autoplay = Autoplay({ delay: 6000, stopOnInteraction: false });
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade(), autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [apiBanners, setApiBanners] = useState<BannersConfig>({ desktop: [], mobile: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setIsLoading(true);
        const [desktopRes, mobileRes] = await Promise.all([
          fetch(`/api/banners?position=${position}&device=desktop&locale=${locale}`),
          fetch(`/api/banners?position=${position}&device=mobile&locale=${locale}`)
        ]);

        if (desktopRes.ok && mobileRes.ok) {
          const desktopData: ApiBanner[] = await desktopRes.json();
          const mobileData: ApiBanner[] = await mobileRes.json();

          // Transform API data to component format
          const transformedBanners: BannersConfig = {
            desktop: desktopData
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((banner, idx) => ({
                id: banner.id.toString(),
                src: banner.imageUrl,
                alt: banner.title || `Banner ${idx + 1}`,
                href: banner.linkUrl || undefined,
                priority: idx === 0,
              })),
            mobile: mobileData
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((banner, idx) => ({
                id: banner.id.toString(),
                src: banner.imageUrl,
                alt: banner.title || `Banner ${idx + 1}`,
                href: banner.linkUrl || undefined,
                priority: idx === 0,
              })),
          };

          setApiBanners(transformedBanners);
        }
      } catch (error) {
        console.error('Error fetching banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, [position, locale]);

  // Use API banners if available, otherwise fallback to prop banners
  const banners = (apiBanners.desktop.length > 0 || apiBanners.mobile.length > 0) 
    ? apiBanners 
    : fallbackBanners || { desktop: [], mobile: [] };

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

  // Show loading state or empty state
  if (isLoading) {
    return (
      <div className="relative w-full h-40 md:h-[560px] overflow-hidden bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Loading banners...</div>
        </div>
      </div>
    );
  }

  if (activeBanners.length === 0) {
    return null;
  }

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
