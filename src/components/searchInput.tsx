"use client";

import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type HeaderSearchProps = {
  basePath?: string;
};

export default function HeaderSearch({ basePath = "/categories" }: HeaderSearchProps) {
  const t = useTranslations("header");
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // 👈 mobile

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim()) {
        router.push(`${basePath}?search=${encodeURIComponent(query.trim())}`);
      }
    }, 500),
    [router, basePath]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    router.push(basePath);
  };

  return (
    <>
      {/* 🖥 Desktop search */}
      <div className="hidden md:block relative w-48 sm:w-64">
        <input
          type="text"
          placeholder={t("search")}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full py-[6px] pr-10 border border-gray-300 rounded-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            text-sm transition-all duration-300
            ${isFocused ? "pl-2" : "pl-10"}`}
        />

        <Search
          size={20}
          className={`absolute top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-300
            ${isFocused ? "right-3 left-auto" : "left-3 right-auto"}`}
        />

        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* 📱 Mobile search button */}
      <button
        aria-label={t("search")}
        className="md:hidden p-2"
        onClick={() => setIsSearchOpen(true)}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* 📱 Mobile overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsSearchOpen(false)}
          />

          <div className="absolute top-0 left-0 right-0 bg-white shadow p-3">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="flex-1 border rounded px-3 py-2"
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />

              {searchQuery && (
                <button onClick={clearSearch} className="p-2">
                  <X className="w-5 h-5" />
                </button>
              )}

              <button
                className="p-2"
                onClick={() => setIsSearchOpen(false)}
                aria-label={t("close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// debounce helper
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}
