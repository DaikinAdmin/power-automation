import Link from "next/link";
import Image from "next/image";
import { useTranslations } from 'next-intl';
import { useCategories } from '@/hooks/useCategories';
import { useLocale } from 'next-intl';
import { useDomainConfig } from '@/hooks/useDomain';

const ACCEPTED_CARDS = [
  {
    id: "visa",
    src: "/imgs/cards/visa.svg",
    alt: "Visa logo",
  },
  {
    id: "mastercard",
    src: "/imgs/cards/mastercard.svg",
    alt: "Mastercard logo",
  }
];

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const { categories, isLoading } = useCategories(locale);
  const domainConfig = useDomainConfig();
  const { contacts } = domainConfig;

  // Two columns of 6; the 6th slot of col2 is always "+X more" link
  const col1 = categories.slice(0, 6);
  const col2 = categories.slice(6, 11); // max 5 items; 6th will be the link
  const remainingCount = Math.max(0, categories.length - 11);
  
  return (
    <footer style={{ backgroundColor: '#404040' }} className="text-white py-12 z-20">
      <div className="max-w-[90rem] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
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
            <p className="text-gray-300 mb-4">{t('copyright')}</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{t('weAccept')}</span>
              <div className="flex gap-2">
                {ACCEPTED_CARDS.map((card) => (
                  <div key={card.id} className="flex items-center justify-center rounded bg-white p-1">
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={56}
                      height={32}
                      className="h-8 w-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Categories — first 6 */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">{t('categories')}</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              {!isLoading && col1.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Categories — next 5 + "+X more" as 6th */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">&nbsp;</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              {!isLoading && col2.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {!isLoading && (
                <li>
                  <Link
                    href="/categories"
                    className="hover:text-white transition-colors text-red-400 font-medium"
                  >
                    +{remainingCount} {t('moreCategories')}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: For Clients */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">{t('forClients')}</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li><a href="/signin" className="hover:text-white transition-colors">{t('links.enterShop')}</a></li>
              <li><Link href="/about" className="hover:text-white transition-colors">{t('links.about')}</Link></li>
              <li><Link href="/brands" className="hover:text-white transition-colors">{t('links.brands')}</Link></li>
              <li><Link href="/purchase-delivery" className="hover:text-white transition-colors">{t('links.purchaseDelivery')}</Link></li>
              <li><Link href="/refunding" className="hover:text-white transition-colors">{t('links.refunding')}</Link></li>
              <li><Link href="/contacts" className="hover:text-white transition-colors">{t('links.contacts')}</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">{t('links.privacyPolicy')}</Link></li>
            </ul>
          </div>

          {/* Column 5: Contact Information */}
          <div>
            <h3 className="text-red-500 font-semibold text-lg mb-4">{t('contactInfo')}</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">📍</div>
                <div>
                  {contacts.address.map((line, i) => (
                    <p key={i} className="text-sm">{line}</p>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">📞</div>
                <a href={`tel:${contacts.phone}`} className="text-sm hover:text-white transition-colors">
                  {contacts.phoneFormatted}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">📧</div>
                <a href={`mailto:${contacts.email}`} className="text-sm hover:text-white transition-colors">
                  {contacts.email}
                  {contacts.contactPerson && <><br />{contacts.contactPerson}</>}
                  {contacts.contactRole && <><br />{contacts.contactRole}</>}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">🕒</div>
                <div>
                  <p className="text-sm">{t('workingHours.weekdays')}</p>
                  <p className="text-sm">{t('workingHours.saturday')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}