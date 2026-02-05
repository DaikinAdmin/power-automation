"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";

interface BannerData {
  id: string;
  src: string;
  alt: string;
  href?: string;
  priority?: boolean;
}

interface BannersConfig {
  ultrawide: BannerData[];
  desktop: BannerData[];
  laptop: BannerData[];
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
  device: string;
  sortOrder: number | null;
}

const Carousel: React.FC<CarouselProps> = ({ position = 'home_top', banners: fallbackBanners }) => {
  const locale = useLocale();
  const autoplay = useMemo(() => Autoplay({ delay: 6000, stopOnInteraction: false }), []);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade(), autoplay]);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deviceType, setDeviceType] = useState<'ultrawide' | 'desktop' | 'laptop' | 'mobile'>('desktop');
  const [apiBanners, setApiBanners] = useState<BannersConfig>({ 
    ultrawide: [], desktop: [], laptop: [], mobile: [] 
  });
  const [isLoading, setIsLoading] = useState(true);

  const getDeviceTag = useCallback(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    
    if (width >= 2000) return 'ultrawide';
    if (width >= 1280) return 'desktop';
    if (width >= 640) return 'laptop';
    
    return 'mobile';
  }, []);

  useEffect(() => {
    const handleResize = () => setDeviceType(getDeviceTag());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getDeviceTag]);

  useEffect(() => {
    const fetchAllBanners = async () => {
      try {
        setIsLoading(true);
        const devices = ['ultrawide', 'desktop', 'laptop', 'mobile'];
        
        const responses = await Promise.all(
          devices.map(d => fetch(`/api/banners?position=${position}&device=${d}&locale=${locale}`))
        );

        const data = await Promise.all(responses.map(res => res.ok ? res.json() : []));

        const transform = (items: ApiBanner[]) => 
          items
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((b, idx) => ({
              id: b.id.toString(),
              src: b.imageUrl,
              alt: b.title || `Banner ${idx + 1}`,
              href: b.linkUrl || undefined,
              priority: idx === 0,
            }));

        setApiBanners({
          ultrawide: transform(data[0]),
          desktop: transform(data[1]),
          laptop: transform(data[2]),
          mobile: transform(data[3]),
        });
      } catch (error) {
        console.error('Error fetching banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllBanners();
  }, [position, locale]);

  const activeBanners = useMemo(() => {
    const current = (apiBanners[deviceType].length > 0) ? apiBanners : (fallbackBanners || apiBanners);
    return current[deviceType] || [];
  }, [apiBanners, fallbackBanners, deviceType]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  if (isLoading) {
    return (
      <div className="w-full aspect-[1080/900] sm:aspect-[3.2/1] [@media(min-width:2000px)]:aspect-[3.583/1] bg-gray-200 animate-pulse" />
    );
  }

  if (activeBanners.length === 0) return null;

  return (
    <section className="relative w-full group">
      <div className="relative w-full overflow-hidden 
        aspect-[1080/900] 
        sm:aspect-[3.2/1] 
        [@media(min-width:2000px)]:aspect-[3.583/1]"
      >
        <div className="h-full" ref={emblaRef}>
          <div className="flex h-full">
            {activeBanners.map((banner) => (
              <div key={banner.id} className="flex-[0_0_100%] min-w-0 h-full relative">
                {banner.href ? (
                  <Link href={banner.href} className="block w-full h-full relative">
                    <Image
                      src={banner.src}
                      alt={banner.alt}
                      fill
                      priority={banner.priority}
                      // For ultrawide screens we want the entire image visible (no horizontal crop)
                      className={`${deviceType === 'ultrawide' ? 'object-contain' : 'object-cover'} object-center`}
                      sizes="(max-width: 640px) 100vw, (max-width: 2000px) 100vw, 3440px"
                    />
                  </Link>
                ) : (
                  <Image
                    src={banner.src}
                    alt={banner.alt}
                    fill
                    priority={banner.priority}
                    className={`${deviceType === 'ultrawide' ? 'object-contain' : 'object-cover'} object-center`}
                    sizes="(max-width: 640px) 100vw, (max-width: 2000px) 100vw, 3440px"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Навігація */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={24} />
            </button>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {activeBanners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`h-1.5 rounded-full transition-all border border-white/50 ${
                    i === selectedIndex ? "w-6 bg-red-600" : "w-1.5 bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Carousel;