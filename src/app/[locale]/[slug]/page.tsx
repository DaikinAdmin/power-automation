import { notFound } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import EditorJSRenderer from "@/components/EditorJSRenderer";
import PageSidebarNav from "@/components/static-pages/side-bar-nav";

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

async function getPageContent(
  locale: string,
  slug: string
): Promise<PageData | null> {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/public/pages/${locale}/${slug}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
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
  const { locale, slug } = await params;
  const page = await getPageContent(locale, slug);

  if (!page || !page.isPublished) {
    notFound();
  }

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
              <EditorJSRenderer data={page.content} />
            </div>

            {page.updatedAt && (
              <p className="text-sm text-gray-500 mt-6">
                Last updated: {new Date(page.updatedAt).toLocaleDateString()}
              </p>
            )}
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

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = await getPageContent(locale, slug);

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.title,
    description:
      page.content.blocks[0]?.data?.text?.substring(0, 160) || page.title,
  };
}
