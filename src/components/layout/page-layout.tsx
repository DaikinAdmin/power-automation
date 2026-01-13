"use client";

import { useState, useEffect, useRef } from "react";
import MainHeader from "./main-header";
import SecondaryHeader from "./secondary-header";
import MobileHeader from "./mobile-header";
import Footer from "./footer";
import CartModal from "@/components/cart-modal";
import CompareModal from "@/components/compare-modal";
import { useCart } from "@/components/cart-context";
import { useCompare } from "@/components/compare-context";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const { cartItems, updateCartQuantity, removeFromCart, updateCartWarehouse, isCartModalOpen, setIsCartModalOpen } = useCart();
  const { compareItems, removeFromCompare, clearCompare, isCompareModalOpen, setIsCompareModalOpen } = useCompare();
  
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const mainHeaderRef = useRef<HTMLDivElement>(null);
  const secondaryHeaderRef = useRef<HTMLDivElement>(null);
  const [mainHeaderHeight, setMainHeaderHeight] = useState(0);
  const [totalHeaderHeight, setTotalHeaderHeight] = useState(0);

  // Розрахунок висоти хедерів
  useEffect(() => {
    const updateHeaderHeights = () => {
      if (mainHeaderRef.current && secondaryHeaderRef.current) {
        const mainHeight = mainHeaderRef.current.offsetHeight;
        const secondaryHeight = secondaryHeaderRef.current.offsetHeight;
        setMainHeaderHeight(mainHeight);
        setTotalHeaderHeight(mainHeight + secondaryHeight);
        
        // Встановлюємо висоту spacer'а
        const spacer = document.getElementById("header-spacer");
        if (spacer) {
          spacer.style.height = `${mainHeight + secondaryHeight}px`;
        }
      }
    };

    updateHeaderHeights();
    
    // Оновлюємо при зміні розміру вікна
    window.addEventListener("resize", updateHeaderHeights);
    
    return () => {
      window.removeEventListener("resize", updateHeaderHeights);
    };
  }, []);

  // Обробка скролу
  useEffect(() => {

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Скрол вниз
        setScrollDirection("down");
        setIsHeaderHidden(true);
      } else if (currentScrollY < lastScrollY.current) {
        // Скрол вверх
        setScrollDirection("up");
        setIsHeaderHidden(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile: unified header; Desktop: existing headers */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50">
        <MobileHeader />
      </div>
      
      {/* Desktop: sticky headers with hide/show on scroll */}
      <div 
        className="hidden md:block fixed top-0 left-0 right-0 transition-transform duration-300 ease-in-out z-50"
        style={{
          transform: isHeaderHidden ? `translateY(-${mainHeaderHeight}px)` : 'translateY(0)',
        }}
      >
        <div ref={mainHeaderRef}>
          <MainHeader />
        </div>
        <div ref={secondaryHeaderRef}>
          <SecondaryHeader />
        </div>
      </div>
      
      {/* Spacer to prevent content from going under fixed headers */}
      <div className="md:hidden" style={{ height: '60px' }} />
      <div className="hidden md:block" id="header-spacer" />
      
      {children}
      
      <Footer />

      {/* Cart Modal */}
      {isCartModalOpen && (
        <CartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onUpdateWarehouse={updateCartWarehouse}
        />
      )}

      {/* Compare Modal */}
      {isCompareModalOpen && (
        <CompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          compareItems={compareItems}
          onRemoveItem={removeFromCompare}
          onClearAll={clearCompare}
        />
      )}
    </div>
  );
}
