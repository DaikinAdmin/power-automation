"use client"

import { useLocale } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"

interface Language {
  code: string
  name: string
  flag: string
}

// Define languages with their flags
const languages: Language[] = [
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ua", name: "Українська", flag: "🇺🇦" },
  { code: "es", name: "Español", flag: "🇪🇸" },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  // Handle language change
  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) return

    try {
      // Update locale on the server (for email preferences)
      await fetch('/api/user/update-locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale })
      }).catch(err => {
        // Silently fail if user is not logged in or if there's an error
        console.log('Could not update locale preference:', err);
      });
    } catch (error) {
      console.log('Error updating locale:', error);
    }

    // Navigate to the same page but with the new locale
    router.replace(pathname, { locale: newLocale })
  }

  // Find the current language object
  const currentLang = languages.find((lang) => lang.code === locale) || languages[0]

  return (
    <div className = "flex flex-inline items-center justify-right">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
          <span className="text-lg" aria-hidden="true">
            {currentLang.flag}
          </span>
          <span className="hidden sm:inline-block">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex items-center gap-2 ${language.code === locale ? "bg-accent font-medium" : ""}`}
          >
            <span className="text-lg" aria-hidden="true">
              {language.flag}
            </span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
}

