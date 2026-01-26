import {defineRouting} from 'next-intl/routing';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['pl', 'es', 'en', 'ua'],
 
  // Used when no locale matches
  defaultLocale: 'pl',

  localePrefix: 'always'
});