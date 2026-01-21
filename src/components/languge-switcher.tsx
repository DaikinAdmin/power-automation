"use client"

import { useLocale } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"
import PL from "country-flag-icons/react/3x2/PL"
import GB from "country-flag-icons/react/3x2/GB"
import UA from "country-flag-icons/react/3x2/UA"
import ES from "country-flag-icons/react/3x2/ES"

interface Language {
  code: string
  name: string
  Flag: React.ComponentType<{ className?: string }>
}

// Список мов з компонентами прапорів
const languages: Language[] = [
  { code: "pl", name: "Polski", Flag: PL },
  { code: "en", name: "English", Flag: GB },
  { code: "ua", name: "Українська", Flag: UA },
  { code: "es", name: "Español", Flag: ES },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return
    
    // Use replace with startTransition to ensure proper navigation
    router.replace(pathname, { locale: newLocale })
    
    // Force refresh to clear Next.js router cache
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  const currentLang = languages.find((lang) => lang.code === locale) || languages[0]

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
            <currentLang.Flag className="w-5 h-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center gap-2 ${language.code === locale ? "bg-accent font-medium" : ""}`}
            >
              <language.Flag className="w-5 h-auto" />
              <span>{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
