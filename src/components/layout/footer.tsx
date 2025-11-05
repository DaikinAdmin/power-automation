import Link from "next/link";
import Image from "next/image";

const ACCEPTED_CARDS = [
  {
    id: "visa",
    src: "/imgs/cards/visa.webp",
    alt: "Visa logo",
  }
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#404040' }} className="text-white py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Column 1: Logo & Company Info */}
          <div>
            <Link href="/" className="mb-4 block" aria-label="Go to homepage">
              <Image
                src="/imgs/Logo_footer.webp"
                alt="Shop logo"
                width={200}
                height={100}
                className="h-[100px] w-[200px]"
              />
            </Link>
            <p className="text-gray-300 mb-4">© 2024 All rights reserved</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">We accept:</span>
              <div className="flex gap-2">
                {ACCEPTED_CARDS.map((card) => (
                  <div key={card.id} className="flex items-center justify-center rounded bg-white p-1">
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={40}
                      height={24}
                      className="h-6 w-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Categories 1 */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">Categories</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Electronics</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Fashion</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Home & Garden</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sports</a></li>
            </ul>
          </div>

          {/* Column 3: Categories 2 */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">More Categories</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Books</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Health & Beauty</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Automotive</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Toys & Games</a></li>
            </ul>
          </div>

          {/* Column 4: For Clients */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">For Clients</h3>
            <ul className="space-y-2 text-gray-300">
              <li><a href="/sign-in" className="hover:text-white transition-colors">Enter the shop</a></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About us</Link></li>
              <li><Link href="/brands" className="hover:text-white transition-colors">Brands</Link></li>
              <li><Link href="/purchase-delivery" className="hover:text-white transition-colors">Purchase and Delivery</Link></li>
              <li><Link href="/refunding" className="hover:text-white transition-colors">Refunding</Link></li>
              <li><Link href="/contacts" className="hover:text-white transition-colors">Contacts</Link></li>
            </ul>
          </div>

          {/* Column 5: Contact Information */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">Contact Information</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">📍</div>
                <div>
                  <p className="text-sm">123 Shop Street</p>
                  <p className="text-sm">City, State 12345</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">📞</div>
                <a href="tel:+1234567890" className="text-sm hover:text-white transition-colors">
                  +1 (234) 567-890
                </a>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">📧</div>
                <a href="mailto:info@shop.com" className="text-sm hover:text-white transition-colors">
                  info@shop.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">🕒</div>
                <div>
                  <p className="text-sm">Mon-Fri: 9AM-6PM</p>
                  <p className="text-sm">Sat: 9AM-4PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
