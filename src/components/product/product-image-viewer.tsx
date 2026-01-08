'use client';

import { useMemo, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs } from 'swiper/modules';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/navigation';

interface ProductImageViewerProps {
  images: string[];
  productName: string;
  badge?: 'bestseller' | 'discount' | 'new' | null;
}

export const ProductImageViewer = ({
  images,
  productName,
  badge,
}: ProductImageViewerProps) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const mainSwiperRef = useRef<any>(null);

  // 👉 твоя логіка парсингу зображень — збережена
  const parsedImages = useMemo(() => {
    if (!images || images.length === 0) return ['/imgs/placeholder-product.jpg'];

    const allImages: string[] = [];
    images.forEach((img) => {
      if (img.includes(';')) {
        allImages.push(
          ...img
            .split(';')
            .map((u) => u.trim())
            .filter(Boolean)
        );
      } else {
        allImages.push(img);
      }
    });

    return allImages.length ? allImages : ['/imgs/placeholder-product.jpg'];
  }, [images]);

  const getBadgeStyles = () => {
    switch (badge) {
      case 'bestseller':
        return 'bg-blue-500 text-white';
      case 'discount':
        return 'bg-red-500 text-white';
      case 'new':
        return 'bg-green-500 text-white';
      default:
        return '';
    }
  };

  const getBadgeText = () => {
    switch (badge) {
      case 'bestseller':
        return 'Bestseller';
      case 'discount':
        return 'Discount';
      case 'new':
        return 'New';
      default:
        return '';
    }
  };

  // Responsive: vertical thumbs for md+, horizontal for mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Prepare slides for lightbox
  const lightboxSlides = parsedImages.map((img) => ({ src: img }));

  return (
    <>
      <div
        className="flex gap-1 md:flex-row flex-col md:items-start items-center w-full max-w-full"
      >
      {/* Thumbnails */}
      {parsedImages.length > 1 && (
        <Swiper
          onSwiper={setThumbsSwiper}
          direction={isMobile ? 'horizontal' : 'vertical'}
          slidesPerView={isMobile ? 4 : 4}
          spaceBetween={10}
          className={`md:w-24 md:h-[420px] w-full h-24 order-2 md:order-none`}
          watchSlidesProgress
          onClick={(_, e) => e.stopPropagation()}
        >
          {parsedImages.map((img, i) => (
            <SwiperSlide key={i}>
              <img
                src={img}
                alt={`${productName} thumbnail ${i + 1}`}
                onClick={() => {
                  setActiveIndex(i);
                  mainSwiperRef.current?.slideTo(i);
                }}
                className={`h-20 w-20 object-cover rounded-md cursor-pointer border-2 transition-all duration-200 ${
                  activeIndex === i ? 'border-red-500' : 'border-transparent'
                }`}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* Main image */}
      <div
        className="relative md:w-[600px] w-full overflow-hidden rounded-lg bg-white flex justify-center items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {badge && (
          <div className="absolute left-4 top-4 z-10">
            <span className={`rounded-md px-3 py-1 text-sm font-semibold ${getBadgeStyles()}`}>
              {getBadgeText()}
            </span>
          </div>
        )}

        <Swiper
          modules={[Thumbs, Navigation]}
          thumbs={{ swiper: thumbsSwiper }}
          navigation={{
            nextEl: '.product-swiper-next',
            prevEl: '.product-swiper-prev',
            disabledClass: 'opacity-0 pointer-events-none',
          }}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="w-full h-auto"
          ref={mainSwiperRef}
          initialSlide={activeIndex}
        >
          {parsedImages.map((img, i) => (
            <SwiperSlide key={i}>
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={img}
                  alt={`${productName} image ${i + 1}`}
                  onClick={() => setLightboxOpen(true)}
                  className="max-h-[600px] w-auto object-contain cursor-zoom-in"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navigation arrows (show on hover for desktop, always on mobile) */}
        {parsedImages.length > 1 && (
          <>
            <button
              className={`product-swiper-prev absolute top-1/2 left-2 -translate-y-1/2 z-20 bg-white/80 rounded-full p-2 shadow transition-opacity duration-200 ${
                isHovered || isMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Previous image"
              tabIndex={isHovered || isMobile ? 0 : -1}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              className={`product-swiper-next absolute top-1/2 right-2 -translate-y-1/2 z-20 bg-white/80 rounded-full p-2 shadow transition-opacity duration-200 ${
                isHovered || isMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Next image"
              tabIndex={isHovered || isMobile ? 0 : -1}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </>
        )}

      </div>
    </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={activeIndex}
        plugins={[Zoom, Thumbnails]}
        on={{
          view: ({ index }) => setActiveIndex(index),
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
        thumbnails={{
          position: 'bottom',
          width: 80,
          height: 80,
          border: 2,
          borderRadius: 4,
          padding: 4,
          gap: 8,
        }}
        carousel={{
          finite: parsedImages.length <= 1,
        }}
      />
    </>
  );
};
