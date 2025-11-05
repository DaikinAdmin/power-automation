import MainHeader from "./main-header";
import SecondaryHeader from "./secondary-header";
import Footer from "./footer";
import CartModal from "@/components/cart-modal";
import { useCart } from "@/components/cart-context";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const { cartItems, updateCartQuantity, removeFromCart, updateCartWarehouse, isCartModalOpen, setIsCartModalOpen } = useCart();

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />
      <SecondaryHeader />
      
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
    </div>
  );
}
