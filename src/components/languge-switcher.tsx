"use client"

import { useLocale } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { usePathname } from "@/i18n/navigation" // useRouter більше не потрібен
import { useDomainConfig } from "@/hooks/useDomain"

interface Language {
  code: string
  name: string
  flag: string
}

const ALL_LANGUAGES: Language[] = [
  { code: "pl", name: "Polski",     flag: "🇵🇱" },
  { code: "en", name: "English",    flag: "🇬🇧" },
  { code: "ua", name: "Українська", flag: "🇺🇦" },
  { code: "es", name: "Español",    flag: "🇪🇸" },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const domainConfig = useDomainConfig()
  const languages = ALL_LANGUAGES.filter((lang) => domainConfig.availableLocales.includes(lang.code))
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;

    // Зберігаємо поточні параметри запиту (наприклад, ?sort=price_asc)
    const searchParams = window.location.search;
    
    // Формуємо новий URL. 
    // Хук usePathname від next-intl повертає шлях БЕЗ локалі (наприклад, /products)
    // Тому ми просто підставляємо нову локаль на початок
    const newPath = pathname === '/' ? `/${newLocale}` : `/${newLocale}${pathname}`;
    
    // Виконуємо жорстке перезавантаження (Hard Reload)
    window.location.href = `${newPath}${searchParams}`;
  }

  const currentLang = languages.find((lang) => lang.code === locale) || languages[0]

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xl leading-none">
            {currentLang.flag}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center gap-2 ${language.code === locale ? "bg-accent font-medium" : ""}`}
            >
              <span className="text-xl leading-none">{language.flag}</span>
              <span>{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}