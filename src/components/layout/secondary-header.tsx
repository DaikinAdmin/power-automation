'use client';
import { useState, useEffect, useCallback } from "react";
import { User, ChevronDown, Settings as SettingsIcon, LogOut, Search, Menu, GitCompare, Heart, ShoppingCart, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart-context";
import { authClient } from "@/lib/auth-client";
import Settings from "@/components/auth/settings";
import SignOut from "@/components/auth/sign-out";
import { Category } from "@/helpers/types/item";
import { useRouter } from "next/navigation";

export default function SecondaryHeader() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { getTotalCartItems, setIsCartModalOpen } = useCart();
  const session = authClient.useSession();
  const router = useRouter();

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/public/categories/pl");
        const fetchedCategories = await response.json() as Category[];
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length > 0) {
        router.push(`/categories?search=${encodeURIComponent(query.trim())}`);
      }
    }, 500),
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    router.push('/categories');
  };

  return (
    <div style={{ backgroundColor: '#404040' }}>
      <div className="px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)} 
              onMouseEnter={() => setIsCategoriesOpen(true)} 
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors h-max"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-layout-grid-icon lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              <span className="hidden sm:inline font-bold">Categories</span>
              <ChevronDown size={16} className={`transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isCategoriesOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsCategoriesOpen(false)} />
                <div 
                  className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border z-20" 
                  onMouseLeave={() => { setIsCategoriesOpen(false); setHoveredCategory(null); }}
                >
                  <div className="py-2 flex">
                    <div className="flex-1 border-r">
                      {categories.map((category) => (
                        <Link 
                          key={category.id} 
                          href={`/category/${category.slug}`} 
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-100 cursor-pointer transition-colors" 
                          onMouseEnter={() => setHoveredCategory(category.id)} 
                          onClick={() => setIsCategoriesOpen(false)}
                        >
                          <span className="font-medium">{category.name}</span>
                        </Link>
                      ))}
                    </div>
                    {hoveredCategory && (
                      <div className="flex-1 px-4 py-2">
                        <div className="text-sm font-semibold text-gray-600 mb-2">
                          {categories.find(cat => cat.id === hoveredCategory)?.name}
                        </div>
                        {categories.find(cat => cat.id === hoveredCategory)?.subCategories?.map((subcategory, index) => (
                          <div 
                            key={index} 
                            className="py-1 text-sm text-gray-700 hover:text-blue-600 cursor-pointer transition-colors" 
                            onClick={() => setIsCategoriesOpen(false)}
                          >
                            {subcategory.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-0.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" 
              />
              <Search className="absolute left-3 top-0.5 text-gray-400" size={20} />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-500 rounded-lg transition-colors text-white">
              <GitCompare size={20} />
            </button>
            <button className="p-2 hover:bg-gray-500 rounded-lg transition-colors text-white">
              <Heart size={20} />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="flex items-center gap-2 p-2 hover:bg-gray-500 rounded-lg transition-colors text-white"
              >
                <User size={20} />
                <span className="text-sm">Enter</span>
                <ChevronDown size={12} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                    <div className="py-2">
                      {session.data?.user && (
                        <>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <LayoutGrid size={16} />
                            <span>Dashboard</span>
                          </Link>
                          <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors">
                            <SettingsIcon size={16} />
                            <Settings />
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors">
                        <LogOut size={16} />
                        <SignOut />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <button 
              onClick={() => setIsCartModalOpen(true)} 
              className="flex items-center gap-2 p-2 hover:bg-gray-500 rounded-lg transition-colors text-white"
            >
              <div className="relative">
                <ShoppingCart size={20} />
                {getTotalCartItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalCartItems()}
                  </span>
                )}
              </div>
              <span className="text-sm">Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}
