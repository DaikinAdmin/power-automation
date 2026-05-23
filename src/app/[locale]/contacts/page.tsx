import { notFound } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import EditorJSRenderer from "@/components/EditorJSRenderer";
import PageSidebarNav from "@/components/static-pages/side-bar-nav";
import { getServerDomainConfig } from "@/lib/server-domain";
import { processEditorJSContent } from "@/lib/content-placeholders";

interface PageData {
  id: number;
  slug: string;
  locale: string;
  title: string;
  content: {
    blocks: any[];
    version?: string;
    time?: number;
  };
  isPublished: boolean;
  updatedAt: string;
}

function getLocation(domainKey: string) {
  switch (domainKey) {
    case "pl":
      return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2506.8776305794254!2d16.95278877656008!3d51.07380894228596!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470fc1458656af5b%3A0xbec4ec597bd6c63e!2sAMM%20Project%20Sp.%20z%20o.o.!5e0!3m2!1spl!2spl!4v1773407810382!5m2!1spl!2spl";
    case "ua":
      return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2550.3597287982648!2d28.68782229999999!3d50.26654149999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x472c64afa722b89d%3A0xa26f4bc142c9960!2sKyivska%20St%2C%2077%2C%20Zhytomyr%2C%20Zhytomyrs%27ka%20oblast%2C%20Ukraina%2C%2010000!5e0!3m2!1spl!2spl!4v1773407378233!5m2!1spl!2spl";
    default:
      return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2506.8776305794254!2d16.95278877656008!3d51.07380894228596!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470fc1458656af5b%3A0xbec4ec597bd6c63e!2sAMM%20Project%20Sp.%20z%20o.o.!5e0!3m2!1spl!2spl!4v1773407810382!5m2!1spl!2spl";
  }
}

async function getPageContent(locale: string): Promise<PageData | null> {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/public/pages/${locale}/contacts`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
    );

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching page:", error);
    return null;
  }
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale } = await params;
  const domainConfig = await getServerDomainConfig();
  const [page] = await Promise.all([getPageContent(locale)]);

  if (!page || !page.isPublished) {
    notFound();
  }

  const processedContent = processEditorJSContent(page.content, domainConfig);

  return (
    <PageLayout>
      <div className="max-w-[90rem] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <PageSidebarNav />

          {/* Content */}
          <div className="flex-1 max-w-5xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              {page.title}
            </h1>

            <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
              <EditorJSRenderer data={processedContent} />
            </div>

            {/* Карта з міткою */}
            <div className="mt-8">
              <div className="rounded-lg overflow-hidden shadow-md">
                <iframe
                  src={getLocation(domainConfig.key)}
                  width="100%"
                  height="400"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// Generate static params for known slugs
export async function generateStaticParams() {
  const slugs = ["about-us", "delivery", "returns", "contacts"];
  const locales = ["pl", "en", "ua", "es"];

  const params = [];
  for (const locale of locales) {
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }

  return params;
}

export { generateContactsMetadata as generateMetadata } from "@/lib/seo-metadata";
