// import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaClient, Badge, Currency } from '@prisma/client';

// // Modify connection string to disable SSL certificate validation for seeding
// const getConnectionString = () => {
//   if (!process.env.DATABASE_URL) return undefined;
  
//   const url = new URL(process.env.DATABASE_URL);
//   url.searchParams.set('sslmode', 'no-verify');
//   return url.toString();
// };

// const connectionString = getConnectionString();
// const prisma = connectionString
//   ? new PrismaClient({
//       adapter: new PrismaPg({ connectionString }),
//     })
//   : new PrismaClient();

// const slugify = (value: string) =>
//   value
//     .normalize('NFKD')
//     .replace(/\p{Diacritic}/gu, '')
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '-')
//     .replace(/^-+|-+$/g, '');

// const BRAND_DATA = [
//   { name: 'Siemens', alias: 'siemens', imageLink: '/imgs/brands/siemens.webp' },
//   { name: 'PILZ', alias: 'pilz', imageLink: '/imgs/brands/pilz.webp' },
//   { name: 'Schneider Electrics', alias: 'schneider-electrics', imageLink: '/imgs/brands/schneider-electric.webp' },
//   { name: 'Atlas Copco', alias: 'atlas-copco', imageLink: '/imgs/brands/atlas-copco.webp' },
//   { name: 'Daikin', alias: 'daikin', imageLink: '/imgs/brands/daikin.webp' },
// ];

// const CATEGORY_NAMES = [
//   'Czujniki',
//   'Przyrządy pomiarowe',
//   'Przetworniki sygnałów',
//   'Sprzęt analityczny',
//   'Systemy wizyjne',
//   'Enkodery',
//   'Zawory',
//   'Komponenty pneumatyczne',
//   'Silniki i napędy',
//   'Przetworniki do silników',
//   'Urządzenia przełączające',
//   'Komponenty systemów sterowania',
//   'Urządzenia komunikacyjne',
//   'Artykuły sterownicze i sygnalizacyjne',
//   'Komponenty systemów bezpieczeństwa',
//   'Sprzęt montażowy',
//   'Konstrukcje',
//   'Bezpieczniki',
//   'Urządzenia pomiarowe',
//   'Motoryzacja',
//   'Urządzenia zabezpieczające',
//   'Komponenty niskonapięciowe',
//   'Klimatyzatory',
// ];

// const DEFAULT_SUBCATEGORIES = [
//   { name: 'Standard', slugSuffix: 'standard' },
//   { name: 'Zaawansowane', slugSuffix: 'zaawansowane' },
// ];

// const ITEMS_DATA = [
//   {
//     articleId: 'SIEMENS-S5-420',
//     categoryName: 'Czujniki',
//     subcategoryName: 'Standard',
//     brandName: 'Siemens',
//     itemName: 'Siemens SIMATIC S5 6ES5 420-7LA11 moduł wejść',
//     imageLink: 'https://placehold.co/600x400?text=Siemens+S5+6ES5+420',
//     description: 'Moduł wejść cyfrowych SIMATIC S5 zapewniający 32 kanały 24V DC z diagnostyką LED.',
//     specifications: 'Wejścia: 32x24V DC, diagnostyka LED, montaż na szynie.',
//     seller: 'Power Automation',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 0, price: 1290.0, quantity: 12, promotionPrice: 1190.0, promoDays: 30, badge: Badge.BESTSELLER },
//       { warehouseIndex: 1, price: 1315.0, quantity: 6, badge: Badge.ABSENT },
//     ],
//   },
//   {
//     articleId: 'PILZ-PMD-700',
//     categoryName: 'Przyrządy pomiarowe',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'PILZ',
//     itemName: 'PILZ PMD 700 analizator parametrów sieci',
//     imageLink: 'https://placehold.co/600x400?text=PILZ+PMD+700',
//     description: 'Zaawansowany analizator parametrów sieci do ciągłego monitoringu napięcia i prądu.',
//     specifications: 'Wejścia 3-fazowe, zapis danych, interfejs Modbus.',
//     seller: 'Automation Experts',
//     warrantyType: 'manufacturer',
//     warrantyLength: 36,
//     prices: [
//       { warehouseIndex: 2, price: 2150.0, quantity: 9, badge: Badge.NEW_ARRIVALS },
//     ],
//   },
//   {
//     articleId: 'SCH-TRS-500',
//     categoryName: 'Przetworniki sygnałów',
//     subcategoryName: 'Standard',
//     brandName: 'Schneider Electrics',
//     itemName: 'Schneider TRS 500 przetwornik sygnału analogowego',
//     imageLink: 'https://placehold.co/600x400?text=Schneider+TRS+500',
//     description: 'Przetwornik sygnału analogowego 4-20 mA z izolacją galwaniczną.',
//     specifications: 'Wejście 0-10V, wyjście 4-20mA, dokładność ±0.1%.',
//     seller: 'Automation Center',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 0, price: 540.0, quantity: 20, promotionPrice: 499.0, promoDays: 45, badge: Badge.HOT_DEALS },
//     ],
//   },
//   {
//     articleId: 'ATLAS-APT-900',
//     categoryName: 'Sprzęt analityczny',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Atlas Copco',
//     itemName: 'Atlas Copco APT 900 analizator ciśnienia',
//     imageLink: 'https://placehold.co/600x400?text=Atlas+Copco+APT+900',
//     description: 'Przenośny analizator ciśnienia, idealny do monitoringu instalacji pneumatycznych.',
//     specifications: 'Zakres 0-16 bar, rejestracja danych, komunikacja USB.',
//     seller: 'EnergoTech',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 3, price: 1750.0, quantity: 5, badge: Badge.NEW_ARRIVALS },
//     ],
//   },
//   {
//     articleId: 'DAIKIN-VIS-300',
//     categoryName: 'Systemy wizyjne',
//     subcategoryName: 'Standard',
//     brandName: 'Daikin',
//     itemName: 'Daikin VIS-300 kamera inspekcyjna',
//     imageLink: 'https://placehold.co/600x400?text=Daikin+VIS-300',
//     description: 'System wizyjny VIS-300 do kontroli jakości w liniach produkcyjnych.',
//     specifications: 'Rozdzielczość 5 MP, oświetlenie LED, zestaw obiektywów.',
//     seller: 'Vision Systems',
//     warrantyType: 'manufacturer',
//     warrantyLength: 18,
//     prices: [
//       { warehouseIndex: 4, price: 3890.0, quantity: 4, badge: Badge.LIMITED_EDITION },
//     ],
//   },
//   {
//     articleId: 'SIEMENS-ENC-840',
//     categoryName: 'Enkodery',
//     subcategoryName: 'Standard',
//     brandName: 'Siemens',
//     itemName: 'Siemens 1XP8001-1 Enc 840 enkoder absolutny',
//     imageLink: 'https://placehold.co/600x400?text=Siemens+1XP8001',
//     description: 'Absolutny enkoder magnetyczny z interfejsem SSI do precyzyjnego pozycjonowania.',
//     specifications: 'Rozdzielczość 12 bit, SSI, IP65.',
//     seller: 'Power Automation',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 0, price: 890.0, quantity: 15, badge: Badge.BESTSELLER },
//     ],
//   },
//   {
//     articleId: 'PILZ-VAL-120',
//     categoryName: 'Zawory',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'PILZ',
//     itemName: 'PILZ PNOZ VZ zawór bezpieczeństwa',
//     imageLink: 'https://placehold.co/600x400?text=PILZ+PNOZ+VZ',
//     description: 'Zawór bezpieczeństwa do obwodów pneumatycznych z podwójnym kanałem.',
//     specifications: 'Ciśnienie 0-10 bar, SIL3, PL e.',
//     seller: 'Safety Systems',
//     warrantyType: 'manufacturer',
//     warrantyLength: 30,
//     prices: [
//       { warehouseIndex: 2, price: 1450.0, quantity: 7, badge: Badge.HOT_DEALS },
//     ],
//   },
//   {
//     articleId: 'SCH-PNE-330',
//     categoryName: 'Komponenty pneumatyczne',
//     subcategoryName: 'Standard',
//     brandName: 'Schneider Electrics',
//     itemName: 'Schneider Lexium Pneumatic 330 zawór rozdzielający',
//     imageLink: 'https://placehold.co/600x400?text=Schneider+Lexium+Pneumatic',
//     description: 'Modułowy zawór rozdzielający Lexium do aplikacji pneumatycznych.',
//     specifications: 'Przepływ 1000 l/min, sterowanie 24V DC.',
//     seller: 'PneumoControl',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 1, price: 720.0, quantity: 18, badge: Badge.ABSENT },
//     ],
//   },
//   {
//     articleId: 'ATLAS-MOT-550',
//     categoryName: 'Silniki i napędy',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Atlas Copco',
//     itemName: 'Atlas Copco GA 550 napęd śrubowy',
//     imageLink: 'https://placehold.co/600x400?text=Atlas+Copco+GA+550',
//     description: 'Wysokowydajny napęd śrubowy do sprężarek GA 550.',
//     specifications: 'Moc 90 kW, wydajność 17 m³/min.',
//     seller: 'Atlas Service',
//     warrantyType: 'manufacturer',
//     warrantyLength: 12,
//     prices: [
//       { warehouseIndex: 3, price: 9850.0, quantity: 2, badge: Badge.LIMITED_EDITION },
//     ],
//   },
//   {
//     articleId: 'DAIKIN-INV-200',
//     categoryName: 'Przetworniki do silników',
//     subcategoryName: 'Standard',
//     brandName: 'Daikin',
//     itemName: 'Daikin VLT 200 przetwornik częstotliwości',
//     imageLink: 'https://placehold.co/600x400?text=Daikin+VLT+200',
//     description: 'Przetwornik częstotliwości VLT 200 do sterowania silnikami HVAC.',
//     specifications: 'Zakres 0,75-7,5 kW, Modbus, IP54.',
//     seller: 'HVAC Control',
//     warrantyType: 'manufacturer',
//     warrantyLength: 36,
//     prices: [
//       { warehouseIndex: 4, price: 2180.0, quantity: 10, promotionPrice: 2050.0, promoDays: 20, badge: Badge.NEW_ARRIVALS },
//     ],
//   },
//   {
//     articleId: 'SIEMENS-SW-500',
//     categoryName: 'Urządzenia przełączające',
//     subcategoryName: 'Standard',
//     brandName: 'Siemens',
//     itemName: 'Siemens Sirius 3RA2615 układ rozruchowy',
//     imageLink: 'https://placehold.co/600x400?text=Siemens+Sirius+3RA2615',
//     description: 'Kompaktowy układ rozruchowy SIRIUS do aplikacji silnikowych.',
//     specifications: 'Prąd 32A, sterowanie 24V DC.',
//     seller: 'Power Automation',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 0, price: 1340.0, quantity: 11, badge: Badge.BESTSELLER },
//     ],
//   },
//   {
//     articleId: 'PILZ-PLC-1000',
//     categoryName: 'Komponenty systemów sterowania',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'PILZ',
//     itemName: 'PILZ PSS 4000 kontroler bezpieczeństwa',
//     imageLink: 'https://placehold.co/600x400?text=PILZ+PSS+4000',
//     description: 'Sterownik bezpieczeństwa PSS 4000 do aplikacji przemysłowych.',
//     specifications: 'SIL3, PL e, komunikacja Ethernet/IP.',
//     seller: 'Safety Automation',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 2, price: 6290.0, quantity: 3, badge: Badge.LIMITED_EDITION },
//     ],
//   },
//   {
//     articleId: 'SCH-COM-210',
//     categoryName: 'Urządzenia komunikacyjne',
//     subcategoryName: 'Standard',
//     brandName: 'Schneider Electrics',
//     itemName: 'Schneider Modicon TM251 moduł komunikacyjny',
//     imageLink: 'https://placehold.co/600x400?text=Schneider+TM251',
//     description: 'Sterownik komunikacyjny TM251 dla rozproszonych systemów sterowania.',
//     specifications: 'Ethernet, Modbus TCP/RTU, CANopen.',
//     seller: 'Automation Center',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 1, price: 1180.0, quantity: 14, badge: Badge.ABSENT },
//     ],
//   },
//   {
//     articleId: 'ATLAS-SIGNAL-45',
//     categoryName: 'Artykuły sterownicze i sygnalizacyjne',
//     subcategoryName: 'Standard',
//     brandName: 'Atlas Copco',
//     itemName: 'Atlas Copco Control 45 panel sygnalizacyjny',
//     imageLink: 'https://placehold.co/600x400?text=Atlas+Control+45',
//     description: 'Panel sygnalizacyjny z alarmami wizualnymi i akustycznymi.',
//     specifications: 'Zasilanie 24V DC, IP54.',
//     seller: 'EnergoTech',
//     warrantyType: 'manufacturer',
//     warrantyLength: 18,
//     prices: [
//       { warehouseIndex: 3, price: 640.0, quantity: 25, badge: Badge.NEW_ARRIVALS },
//     ],
//   },
//   {
//     articleId: 'DAIKIN-SAFE-880',
//     categoryName: 'Komponenty systemów bezpieczeństwa',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Daikin',
//     itemName: 'Daikin SafeGuard 880 moduł bezpieczeństwa',
//     imageLink: 'https://placehold.co/600x400?text=Daikin+SafeGuard+880',
//     description: 'Moduł bezpieczeństwa SafeGuard do systemów HVAC i automatyki.',
//     specifications: 'Wejścia bezpieczeństwa 8x, certyfikat SIL3.',
//     seller: 'Safety Systems',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 4, price: 1980.0, quantity: 6, promotionPrice: 1890.0, promoDays: 15, badge: Badge.HOT_DEALS },
//     ],
//   },
//   {
//     articleId: 'SIEMENS-MONT-300',
//     categoryName: 'Sprzęt montażowy',
//     subcategoryName: 'Standard',
//     brandName: 'Siemens',
//     itemName: 'Siemens Sitop MON 300 zestaw montażowy',
//     imageLink: 'https://placehold.co/600x400?text=Siemens+Sitop+MON+300',
//     description: 'Zestaw montażowy Sitop do szaf sterowniczych.',
//     specifications: 'Komplet elementów montażowych, kompatybilność SITOP.',
//     seller: 'Power Automation',
//     warrantyType: 'manufacturer',
//     warrantyLength: 12,
//     prices: [
//       { warehouseIndex: 0, price: 320.0, quantity: 40, badge: Badge.ABSENT },
//     ],
//   },
//   {
//     articleId: 'PILZ-STR-500',
//     categoryName: 'Konstrukcje',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'PILZ',
//     itemName: 'PILZ Struct 500 profil aluminiowy',
//     imageLink: 'https://placehold.co/600x400?text=PILZ+Struct+500',
//     description: 'System profilowy do budowy konstrukcji ochronnych.',
//     specifications: 'Profil aluminiowy 45x45, anodowany.',
//     seller: 'Safety Systems',
//     warrantyType: 'manufacturer',
//     warrantyLength: 12,
//     prices: [
//       { warehouseIndex: 2, price: 210.0, quantity: 60, badge: Badge.ABSENT },
//     ],
//   },
//   {
//     articleId: 'SCH-FUSE-16',
//     categoryName: 'Bezpieczniki',
//     subcategoryName: 'Standard',
//     brandName: 'Schneider Electrics',
//     itemName: 'Schneider Acti9 iC60 bezpiecznik 16A',
//     imageLink: 'https://placehold.co/600x400?text=Schneider+Acti9+iC60',
//     description: 'Wyłącznik nadprądowy Acti9 iC60 16A B-charakterystyka.',
//     specifications: '16A, 6kA, 1P, zgodny z IEC/EN 60898-1.',
//     seller: 'Automation Center',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 1, price: 48.0, quantity: 200, badge: Badge.BESTSELLER },
//     ],
//   },
//   {
//     articleId: 'ATLAS-MEAS-720',
//     categoryName: 'Urządzenia pomiarowe',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Atlas Copco',
//     itemName: 'Atlas Copco MEAS 720 analizator energii',
//     imageLink: 'https://placehold.co/600x400?text=Atlas+MEAS+720',
//     description: 'Analizator energii elektrycznej MEAS 720 do monitoringu zużycia.',
//     specifications: 'Pomiar mocy czynnej/biernej, interfejs Ethernet.',
//     seller: 'EnergoTech',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 3, price: 2540.0, quantity: 8, badge: Badge.NEW_ARRIVALS },
//     ],
//   },
//   {
//     articleId: 'DAIKIN-MOTO-110',
//     categoryName: 'Motoryzacja',
//     subcategoryName: 'Standard',
//     brandName: 'Daikin',
//     itemName: 'Daikin Moto 110 układ klimatyzacji pojazdu',
//     imageLink: 'https://placehold.co/600x400?text=Daikin+Moto+110',
//     description: 'Modułowa jednostka klimatyzacji dla pojazdów specjalnych.',
//     specifications: 'Zasilanie 24V DC, wydajność 5kW.',
//     seller: 'HVAC Control',
//     warrantyType: 'manufacturer',
//     warrantyLength: 18,
//     prices: [
//       { warehouseIndex: 4, price: 3290.0, quantity: 3, badge: Badge.LIMITED_EDITION },
//     ],
//   },
//   {
//     articleId: 'SIEMENS-PRO-750',
//     categoryName: 'Urządzenia zabezpieczające',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Siemens',
//     itemName: 'Siemens SIPROTEC 7SJ750 przekaźnik zabezpieczeniowy',
//     imageLink: 'https://placehold.co/600x400?text=Siemens+SIPROTEC+7SJ750',
//     description: 'Cyfrowy przekaźnik zabezpieczeniowy SIPROTEC dla sieci średniego napięcia.',
//     specifications: 'IEC 61850, zapis zakłóceń, pomiar energii.',
//     seller: 'Power Automation',
//     warrantyType: 'manufacturer',
//     warrantyLength: 36,
//     prices: [
//       { warehouseIndex: 0, price: 4920.0, quantity: 4, badge: Badge.BESTSELLER },
//     ],
//   },
//   {
//     articleId: 'PILZ-LV-250',
//     categoryName: 'Komponenty niskonapięciowe',
//     subcategoryName: 'Standard',
//     brandName: 'PILZ',
//     itemName: 'PILZ LV 250 moduł kontrolny 24V',
//     imageLink: 'https://placehold.co/600x400?text=PILZ+LV+250',
//     description: 'Moduł kontrolny niskonapięciowy do aplikacji bezpieczeństwa.',
//     specifications: 'Wejścia 8x, wyjścia przekaźnikowe 4x.',
//     seller: 'Safety Systems',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 2, price: 680.0, quantity: 14, badge: Badge.HOT_DEALS },
//     ],
//   },
//   {
//     articleId: 'ATLAS-AC-9000',
//     categoryName: 'Klimatyzatory',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Atlas Copco',
//     itemName: 'Atlas Copco AirCool 9000 jednostka klimatyzacyjna',
//     imageLink: 'https://placehold.co/600x400?text=Atlas+AirCool+9000',
//     description: 'Kompaktowa jednostka klimatyzacyjna do szaf sterowniczych.',
//     specifications: 'Wydajność chłodnicza 2,5 kW, montaż boczny.',
//     seller: 'EnergoTech',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 3, price: 1650.0, quantity: 9, badge: Badge.NEW_ARRIVALS },
//     ],
//   },
//   {
//     articleId: 'DAIKIN-COMM-450',
//     categoryName: 'Urządzenia komunikacyjne',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Daikin',
//     itemName: 'Daikin Comm 450 bramka komunikacyjna HVAC',
//     imageLink: 'https://placehold.co/600x400?text=Daikin+Comm+450',
//     description: 'Bramka komunikacyjna do integracji systemów HVAC z SCADA.',
//     specifications: 'BACnet/IP, Modbus TCP, REST API.',
//     seller: 'HVAC Control',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 4, price: 1240.0, quantity: 6, badge: Badge.ABSENT },
//     ],
//   },
//   {
//     articleId: 'SCH-DRV-800',
//     categoryName: 'Silniki i napędy',
//     subcategoryName: 'Standard',
//     brandName: 'Schneider Electrics',
//     itemName: 'Schneider Altivar 800 falownik',
//     imageLink: 'https://placehold.co/600x400?text=Schneider+Altivar+800',
//     description: 'Falownik Altivar 800 do zaawansowanych aplikacji pompowych.',
//     specifications: 'Moc 55 kW, sterowanie wektorowe, Modbus.',
//     seller: 'Automation Center',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 1, price: 7890.0, quantity: 3, badge: Badge.LIMITED_EDITION },
//     ],
//   },
//   {
//     articleId: 'SIEMENS-PNE-920',
//     categoryName: 'Komponenty pneumatyczne',
//     subcategoryName: 'Zaawansowane',
//     brandName: 'Siemens',
//     itemName: 'Siemens Pneuma 920 regulator przepływu',
//     imageLink: 'https://placehold.co/600x400?text=Siemens+Pneuma+920',
//     description: 'Precyzyjny regulator przepływu dla systemów pneumatycznych.',
//     specifications: 'Przepływ 500 l/min, sterowanie proporcjonalne.',
//     seller: 'PneumoControl',
//     warrantyType: 'manufacturer',
//     warrantyLength: 24,
//     prices: [
//       { warehouseIndex: 0, price: 960.0, quantity: 16, badge: Badge.ABSENT },
//     ],
//   },
// ];

// async function main() {
//   console.log('Start seeding...');
//   await cleanupDatabase();

//   const warehouses = await seedWarehouses();
//   const brands = await seedBrands();
//   const { categories, subcategories } = await seedCategories();

//   await seedItems(warehouses, brands, categories, subcategories);
//   await seedCurrencyExchanges();

//   console.log('Seeding finished.');
// }

// async function cleanupDatabase() {
//   console.log('Cleaning up database...');

//   await prisma.currencyExchange.deleteMany({});
//   await prisma.itemPriceHistory.deleteMany({});
//   await prisma.itemPrice.deleteMany({});
//   await prisma.itemDetails.deleteMany({});
//   await prisma.item.deleteMany({});
//   await prisma.subCategories.deleteMany({});
//   await prisma.category.deleteMany({});
//   await prisma.brand.deleteMany({});
//   await prisma.warehouse.deleteMany({});

//   await prisma.account.deleteMany({});
//   await prisma.user.deleteMany({
//     where: {
//       email: {
//         in: ['admin@example.com', 'user@example.com', 'employer@example.com']
//       }
//     }
//   });

//   console.log('Database cleaned');
// }

// async function seedWarehouses() {
//   console.log('Seeding warehouses...');

//   const warehouseData = [
//     { name: 'Warsaw Main Warehouse', country: 'Poland', displayedName: 'Warehouse 1' },
//     { name: 'Krakow Distribution Center', country: 'Poland', displayedName: 'Warehouse 2' },
//     { name: 'Kyiv Central Storage', country: 'Ukraine', displayedName: 'Warehouse 3' },
//     { name: 'Lviv Warehouse', country: 'Ukraine', displayedName: 'Warehouse 4' },
//     { name: 'Berlin Hub', country: 'Germany', displayedName: 'Warehouse 5' },
//   ];

//   const warehouses = [] as Awaited<ReturnType<typeof prisma.warehouse.create>>[];

//   for (const data of warehouseData) {
//     const warehouse = await prisma.warehouse.create({
//       data: {
//         ...data,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       },
//     });
//     warehouses.push(warehouse);
//     console.log(`Created warehouse: ${warehouse.displayedName}`);
//   }

//   return warehouses;
// }

// async function seedBrands() {
//   console.log('Seeding brands...');

//   const brands = [] as Awaited<ReturnType<typeof prisma.brand.create>>[];

//   for (const data of BRAND_DATA) {
//     const brand = await prisma.brand.create({
//       data: {
//         name: data.name,
//         alias: data.alias,
//         imageLink: data.imageLink,
//         isVisible: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       },
//     });
//     brands.push(brand);
//     console.log(`Created brand: ${brand.name}`);
//   }

//   return brands;
// }

// async function seedCategories() {
//   console.log('Seeding categories and subcategories...');

//   const categories: Awaited<ReturnType<typeof prisma.category.create>>[] = [];
//   const subcategories: Record<string, Awaited<ReturnType<typeof prisma.subCategories.create>>[]> = {};

//   for (const name of CATEGORY_NAMES) {
//     const category = await prisma.category.create({
//       data: {
//         name,
//         slug: slugify(name),
//         isVisible: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       },
//     });

//     categories.push(category);
//     subcategories[category.id] = [];

//     for (const sub of DEFAULT_SUBCATEGORIES) {
//       const subCategory = await prisma.subCategories.create({
//         data: {
//           name: sub.name,
//           slug: `${slugify(name)}-${sub.slugSuffix}`,
//           categorySlug: category.id,
//           isVisible: true,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });
//       subcategories[category.id].push(subCategory);
//     }

//     console.log(`Created category: ${category.name}`);
//   }

//   return { categories, subcategories };
// }

// async function seedItems(
//   warehouses: Awaited<ReturnType<typeof prisma.warehouse.create>>[],
//   brands: Awaited<ReturnType<typeof prisma.brand.create>>[],
//   categories: Awaited<ReturnType<typeof prisma.category.create>>[],
//   subcategories: Record<string, Awaited<ReturnType<typeof prisma.subCategories.create>>[]>
// ) {
//   console.log('Seeding items...');

//   const brandMap = new Map(brands.map((brand) => [brand.name, brand]));
//   const categoryMap = new Map(categories.map((category) => [category.name, category]));

//   for (const itemData of ITEMS_DATA) {
//     const category = categoryMap.get(itemData.categoryName);
//     if (!category) {
//       console.warn(`Category ${itemData.categoryName} not found, skipping item ${itemData.articleId}`);
//       continue;
//     }

//     const subcategory = subcategories[category.id]?.find((sub) => sub.name === itemData.subcategoryName) || subcategories[category.id]?.[0];
//     if (!subcategory) {
//       console.warn(`Subcategory ${itemData.subcategoryName} not found in category ${itemData.categoryName}`);
//       continue;
//     }

//     const brand = brandMap.get(itemData.brandName);
//     if (!brand) {
//       console.warn(`Brand ${itemData.brandName} not found, skipping item ${itemData.articleId}`);
//       continue;
//     }

//     const createdItem = await prisma.item.create({
//       data: {
//         articleId: itemData.articleId,
//         isDisplayed: true,
//         itemImageLink: itemData.imageLink,
//         brandId: brand.id,
//         brandName: brand.name,
//         warrantyType: itemData.warrantyType,
//         warrantyLength: itemData.warrantyLength,
//         categorySlug: category!.id,
//         subCategorySlug: subcategory.id,
//         itemDetails: {
//           create: [
//             {
//               locale: 'pl',
//               itemName: itemData.itemName,
//               description: itemData.description,
//               specifications: itemData.specifications,
//               seller: itemData.seller,
//               discount: null,
//               popularity: null,
//             },
//           ],
//         },
//         itemPrice: {
//           create: itemData.prices.map((price) => ({
//             warehouseId: warehouses[price.warehouseIndex]?.id,
//             price: price.price,
//             quantity: price.quantity,
//             promotionPrice: (price as any).promotionPrice ?? null,
//             promoEndDate: (price as any).promoDays ? new Date(Date.now() + (price as any).promoDays * 86400000) : null,
//             promoCode: (price as any).promoCode ?? null,
//             badge: price.badge || Badge.ABSENT,
//           })),
//         },
//       },
//       include: {
//         itemPrice: true,
//       },
//     });

//     await prisma.itemPriceHistory.createMany({
//       data: createdItem.itemPrice.map((price: { warehouseId: any; price: any; quantity: any; badge: any; }) => ({
//         itemId: createdItem.id,
//         warehouseId: price.warehouseId,
//         price: price.price,
//         quantity: price.quantity,
//         promotionPrice: (price as any).promotionPrice,
//         promoEndDate: (price as any).promoEndDate || null,
//         promoCode: (price as any).promoCode || null,
//         badge: price.badge || Badge.ABSENT,
//       })),
//     });

//     console.log(`Created item: ${itemData.itemName}`);
//   }
// }

// async function seedCurrencyExchanges() {
//   console.log('Seeding currency exchange rates...');

//   const currencyPairs = [
//     { from: Currency.EUR, to: Currency.PLN, rate: 4.32 },
//     { from: Currency.EUR, to: Currency.UAH, rate: 40.5 },
//     { from: Currency.PLN, to: Currency.EUR, rate: 0.231 },
//     { from: Currency.UAH, to: Currency.EUR, rate: 0.0247 },
//   ];

//   for (const pair of currencyPairs) {
//     const exchange = await prisma.currencyExchange.create({
//       data: {
//         from: pair.from,
//         to: pair.to,
//         rate: pair.rate,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       },
//     });
//     console.log(`Created currency exchange: ${exchange.from} -> ${exchange.to} (${exchange.rate})`);
//   }
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
