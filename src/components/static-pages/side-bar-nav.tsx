"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { slug: "about-us", label: "About us" },
  { slug: "brands", label: "Brands" },
  { slug: "purchase-delivery", label: "Delivery" },
  { slug: "refunding", label: "Refunding" },
  { slug: "contacts", label: "Contacts" },
];

export default function PageSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:block w-full md:w-64">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname?.includes(item.slug);

            return (
              <li key={item.slug}>
                <Link
                  href={item.slug}
                  className={clsx(
                    "block px-4 py-2 rounded-md text-sm font-medium transition",
                    isActive
                      ? "bg-red-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}