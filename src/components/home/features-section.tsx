import Image from "next/image";
import { useTranslations } from "next-intl";

const FEATURE_ITEMS = [
  {
    id: "payment",
    titleKey: "payment",
    imageSrc: "/imgs/feature/payment.webp",
    imageAlt: "Illustration representing payment on delivery",
  },
  {
    id: "refund",
    titleKey: "refund",
    imageSrc: "/imgs/feature/return-refund.webp",
    imageAlt: "Illustration representing refunding",
  },
  {
    id: "delivery",
    titleKey: "delivery",
    imageSrc: "/imgs/feature/delivery.webp",
    imageAlt: "Illustration representing fast delivery",
  },
  {
    id: "warranty",
    titleKey: "warranty",
    imageSrc: "/imgs/feature/warranty.webp",
    imageAlt: "Illustration representing product quality",
  },
  {
    id: "one-click",
    titleKey: "oneClick",
    imageSrc: "/imgs/feature/one-click.webp",
    imageAlt: "Illustration representing one-click buy",
  },
];

export default function FeaturesSection() {
  const t = useTranslations("home");

  return (
    <section className="bg-white w-full hidden md:block">
      <div className="max-w-[90rem] mx-auto px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-5 gap-5">
        {FEATURE_ITEMS.map((feature) => (
          <div
            key={feature.id}
            className="flex items-center justify-between gap-3 py-8"
          >
            <Image
              src={feature.imageSrc}
              alt={feature.imageAlt}
              width={96}
              height={96}
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 35vw, 60vw"
            />
            <div className="flex-1 text-left">
              <h3 className="text-features-text text-gray-900">
                {t(`features.${feature.titleKey}`)}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
