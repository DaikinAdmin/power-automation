'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface ProductImageViewerProps {
  images: string[];
  productName: string;
  badge?: 'bestseller' | 'discount' | 'new' | null;
}

export const ProductImageViewer = ({ images, productName, badge }: ProductImageViewerProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Parse images - handle case where URLs might be separated by ";" or "; "
  const parsedImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    
    const allImages: string[] = [];
    images.forEach(imageString => {
      if (imageString.includes(';')) {
        // Split by ";" and trim each URL
        const splitImages = imageString
          .split(';')
          .map(url => url.trim())
          .filter(Boolean);
        allImages.push(...splitImages);
      } else {
        allImages.push(imageString);
      }
    });
    
    return allImages.length > 0 ? allImages : ['/imgs/placeholder-product.jpg'];
  }, [images]);

  const currentImage = parsedImages[selectedImageIndex];
  const hasMultipleImages = parsedImages.length > 1;

  const handlePrevious = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? parsedImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) => (prev === parsedImages.length - 1 ? 0 : prev + 1));
  };

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

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {badge && (
          <div className="absolute left-4 top-4 z-10">
            <span className={`rounded-md px-3 py-1 text-sm font-semibold ${getBadgeStyles()}`}>
              {getBadgeText()}
            </span>
          </div>
        )}

        <img
          src={currentImage}
          alt={`${productName} - Image ${selectedImageIndex + 1}`}
          className={`h-full w-full object-cover transition-transform duration-300 ${
            isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Navigation Arrows - Only show if multiple images */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 text-gray-800" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Zoom Icon */}
        <div className="absolute bottom-4 right-4 rounded-full bg-white/80 p-2 shadow-lg">
          <ZoomIn className="h-5 w-5 text-gray-800" />
        </div>

        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-4 left-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white">
            {selectedImageIndex + 1} / {parsedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails - Only show if multiple images */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {parsedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                index === selectedImageIndex
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                className="h-20 w-20 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
