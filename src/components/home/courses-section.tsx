"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

type Course = {
  slug: string;
  title: string;
  description: string;
  href: string;
  image?: string;
};

// Course copy is sourced from ammis.com.ua and kept in Ukrainian (the courses
// are delivered in Ukrainian), unlike the surrounding UI chrome which is translated.
const COURSES: Course[] = [
  {
    slug: "s7-1200-basic",
    title: "STEP 7 – 1200 Basic",
    description:
      "Розробка, конфігурація, програмування та діагностика систем автоматизації на контролерах Siemens S7-1200 у TIA Portal.",
    href: "https://ammis.com.ua/s7-1200-basic/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B86.jpg",
  },
  {
    slug: "s7-1200-advanced",
    title: "STEP 7 – 1200 Advanced",
    description:
      "Поглиблене програмування S7-1200: розширена апаратна конфігурація, функції, функціональні блоки та мережі PROFINET IO.",
    href: "https://ammis.com.ua/s7-1200-advanced/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B85.jpg",
  },
  {
    slug: "ecostruxure-machine-expert-basic",
    title: "EcoStruxure Machine Expert Basic",
    description:
      "Програмування та введення в експлуатацію контролерів Modicon TM241 у середовищі EcoStruxure Machine Expert.",
    href: "https://ammis.com.ua/ecostruxture-machine-expert-basic/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/06/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B88.jpg",
  },
  {
    slug: "sinamics-g120",
    title: "SINAMICS G120",
    description:
      "Налаштування та введення в експлуатацію частотних перетворювачів Siemens SINAMICS G120: STARTDRIVE і PROFINET.",
    href: "https://ammis.com.ua/sinamics-g120/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B87.jpg",
  },
  {
    slug: "profibus-diagnostics",
    title: "PROFIBUS: конфігурація мережі та діагностика",
    description:
      "Конфігурація, введення в експлуатацію та діагностика мереж PROFIBUS DP, аналіз типових помилок у промислових мережах.",
    href: "https://ammis.com.ua/profibus-конфігурація-мережі-та-діагности/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B84-2.jpg",
  },
  {
    slug: "profinet-diagnostics",
    title: "PROFINET: конфігурація мережі та діагностика",
    description:
      "Побудова, конфігурація, введення в експлуатацію та діагностика промислової мережі PROFINET, аналіз протоколів.",
    href: "https://ammis.com.ua/profinet-конфігурація-мережі-та-діагности/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B83-2.jpg",
  },
  {
    slug: "pnozmulti-programming",
    title: "PNOZmulti: програмування та обслуговування",
    description:
      "Конфігурування, діагностика та обслуговування систем безпеки на базі контролерів Pilz PNOZmulti.",
    href: "https://ammis.com.ua/pnozmulti-програмування-та-обслуговування/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B81-2.jpg",
  },
  {
    slug: "machine-safety-basics",
    title: "Основи безпеки машин",
    description:
      "Вимоги машинної директиви 2006/42/ЄС та міжнародних стандартів: безпечна експлуатація обладнання, зниження виробничих ризиків.",
    href: "https://ammis.com.ua/основи-безпеки-машин/",
    image: "https://ammis.com.ua/wp-content/uploads/2025/05/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%D0%B82-2.jpg",
  },
];

function CourseImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  const showPlaceholder = !src || error;

  return (
    <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
      {showPlaceholder ? (
        <svg
          className="w-10 h-10 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export default function CoursesSection() {
  const t = useTranslations("home");

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
    breakpoints: {
      "(min-width: 768px)": { dragFree: false },
    },
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="bg-white w-full">
      <div className="max-w-[90rem] mx-auto px-2 sm:px-4 py-6 mb-12">
        <div className="text-center mb-6">
          <h2 className="text-tabs-title font-bold text-gray-800">
            {t("sections.courses")}
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-2xl mx-auto">
            {t("courses.subtitle")}
          </p>
        </div>

        <div className="relative md:px-12">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {COURSES.map((course) => (
                <a
                  key={course.slug}
                  href={course.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-[0_0_82%] sm:flex-[0_0_55%] md:flex-[0_0_42%] lg:flex-[0_0_31%] xl:flex-[0_0_23%] bg-white border border-gray-200 group relative hover:border-accent transition-colors flex flex-col"
                >
                  <span className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-semibold rounded bg-primary-gray text-white">
                    {t("courses.badge")}
                  </span>

                  <CourseImage src={course.image} alt={course.title} />

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-[15px] leading-[18px] font-semibold text-gray-900 line-clamp-2 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {course.description}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 text-accent text-sm font-semibold group-hover:gap-2 transition-all">
                      {t("courses.cta")}
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Previous"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            className={`hidden md:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md text-gray-700 transition-colors hover:border-accent hover:text-accent ${
              canScrollPrev ? "" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            className={`hidden md:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md text-gray-700 transition-colors hover:border-accent hover:text-accent ${
              canScrollNext ? "" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
