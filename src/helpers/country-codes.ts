export type CountryEntry = {
  countryCode: string;
  phoneCode: string;
  vatPercentage: number;
  name: string;
};

export const europeanCountries: CountryEntry[] = [
  // EU member states (excl. Russia)
  { countryCode: 'AT', phoneCode: '+43',  vatPercentage: 20, name: 'Austria' },
  { countryCode: 'BE', phoneCode: '+32',  vatPercentage: 21, name: 'Belgium' },
  { countryCode: 'BG', phoneCode: '+359', vatPercentage: 20, name: 'Bulgaria' },
  { countryCode: 'HR', phoneCode: '+385', vatPercentage: 25, name: 'Croatia' },
  { countryCode: 'CY', phoneCode: '+357', vatPercentage: 19, name: 'Cyprus' },
  { countryCode: 'CZ', phoneCode: '+420', vatPercentage: 21, name: 'Czech Republic' },
  { countryCode: 'DK', phoneCode: '+45',  vatPercentage: 25, name: 'Denmark' },
  { countryCode: 'EE', phoneCode: '+372', vatPercentage: 22, name: 'Estonia' },
  { countryCode: 'FI', phoneCode: '+358', vatPercentage: 24, name: 'Finland' },
  { countryCode: 'FR', phoneCode: '+33',  vatPercentage: 20, name: 'France' },
  { countryCode: 'DE', phoneCode: '+49',  vatPercentage: 19, name: 'Germany' },
  { countryCode: 'GR', phoneCode: '+30',  vatPercentage: 24, name: 'Greece' },
  { countryCode: 'HU', phoneCode: '+36',  vatPercentage: 27, name: 'Hungary' },
  { countryCode: 'IE', phoneCode: '+353', vatPercentage: 23, name: 'Ireland' },
  { countryCode: 'IT', phoneCode: '+39',  vatPercentage: 22, name: 'Italy' },
  { countryCode: 'LV', phoneCode: '+371', vatPercentage: 21, name: 'Latvia' },
  { countryCode: 'LT', phoneCode: '+370', vatPercentage: 21, name: 'Lithuania' },
  { countryCode: 'LU', phoneCode: '+352', vatPercentage: 17, name: 'Luxembourg' },
  { countryCode: 'MT', phoneCode: '+356', vatPercentage: 18, name: 'Malta' },
  { countryCode: 'NL', phoneCode: '+31',  vatPercentage: 21, name: 'Netherlands' },
  { countryCode: 'PL', phoneCode: '+48',  vatPercentage: 23, name: 'Poland' },
  { countryCode: 'PT', phoneCode: '+351', vatPercentage: 23, name: 'Portugal' },
  { countryCode: 'RO', phoneCode: '+40',  vatPercentage: 19, name: 'Romania' },
  { countryCode: 'SK', phoneCode: '+421', vatPercentage: 20, name: 'Slovakia' },
  { countryCode: 'SI', phoneCode: '+386', vatPercentage: 22, name: 'Slovenia' },
  { countryCode: 'ES', phoneCode: '+34',  vatPercentage: 21, name: 'Spain' },
  { countryCode: 'SE', phoneCode: '+46',  vatPercentage: 25, name: 'Sweden' },
  // Non-EU European states
  { countryCode: 'AL', phoneCode: '+355', vatPercentage: 20, name: 'Albania' },
  { countryCode: 'AD', phoneCode: '+376', vatPercentage: 0,  name: 'Andorra' },
  { countryCode: 'AM', phoneCode: '+374', vatPercentage: 20, name: 'Armenia' },
  { countryCode: 'AZ', phoneCode: '+994', vatPercentage: 18, name: 'Azerbaijan' },
  { countryCode: 'BY', phoneCode: '+375', vatPercentage: 20, name: 'Belarus' },
  { countryCode: 'BA', phoneCode: '+387', vatPercentage: 17, name: 'Bosnia and Herzegovina' },
  { countryCode: 'GE', phoneCode: '+995', vatPercentage: 18, name: 'Georgia' },
  { countryCode: 'IS', phoneCode: '+354', vatPercentage: 24, name: 'Iceland' },
  { countryCode: 'LI', phoneCode: '+423', vatPercentage: 8,  name: 'Liechtenstein' },
  { countryCode: 'MD', phoneCode: '+373', vatPercentage: 20, name: 'Moldova' },
  { countryCode: 'MC', phoneCode: '+377', vatPercentage: 20, name: 'Monaco' },
  { countryCode: 'ME', phoneCode: '+382', vatPercentage: 21, name: 'Montenegro' },
  { countryCode: 'MK', phoneCode: '+389', vatPercentage: 18, name: 'North Macedonia' },
  { countryCode: 'NO', phoneCode: '+47',  vatPercentage: 25, name: 'Norway' },
  { countryCode: 'SM', phoneCode: '+378', vatPercentage: 0,  name: 'San Marino' },
  { countryCode: 'RS', phoneCode: '+381', vatPercentage: 20, name: 'Serbia' },
  { countryCode: 'CH', phoneCode: '+41',  vatPercentage: 8,  name: 'Switzerland' },
  { countryCode: 'TR', phoneCode: '+90',  vatPercentage: 20, name: 'Turkey' },
  { countryCode: 'UA', phoneCode: '+380', vatPercentage: 20, name: 'Ukraine' },
  { countryCode: 'GB', phoneCode: '+44',  vatPercentage: 20, name: 'United Kingdom' },
  { countryCode: 'VA', phoneCode: '+379', vatPercentage: 0,  name: 'Vatican City' },
  { countryCode: 'XK', phoneCode: '+383', vatPercentage: 18, name: 'Kosovo' },
];

// Legacy export for any existing usages
export const countryCodes = europeanCountries.map(c => ({ code: c.phoneCode, country: c.countryCode }));
