"use client"

import { useLocale } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"
import { FlagIcon, FlagIconCode } from "react-flag-kit"

interface Language {
  code: string
  name: string
  countryCode: FlagIconCode // тепер строго під тип прапора
}

// Список мов з кодами країн для прапорів
const languages: Language[] = [
  { code: "pl", name: "Polski", countryCode: "PL" },
  { code: "en", name: "English", countryCode: "GB" },
  { code: "ua", name: "Українська", countryCode: "UA" },
  { code: "es", name: "Español", countryCode: "ES" },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return
    router.replace(pathname, { locale: newLocale })
  }

  const currentLang = languages.find((lang) => lang.code === locale) || languages[0]

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
            <FlagIcon code={currentLang.countryCode} size={20} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center gap-2 ${language.code === locale ? "bg-accent font-medium" : ""}`}
            >
              <FlagIcon code={language.countryCode} size={20} />
              <span>{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
