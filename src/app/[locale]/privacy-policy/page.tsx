import PageLayout from "@/components/layout/page-layout";
import { useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
export { generatePrivacyPolicyMetadata as generateMetadata } from "@/lib/seo-metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacyPolicy");

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">
          {t("title")}
        </h1>

        <div className="bg-white rounded-lg shadow-sm p-6 md:p-10 space-y-8 text-gray-700 leading-relaxed">

          <p className="text-sm text-gray-500">{t("lastUpdated")}</p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s1.title")}</h2>
            <p>{t("s1.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s2.title")}</h2>
            <p>{t("s2.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s3.title")}</h2>
            <p className="mb-2">{t("s3.intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("s3.item1")}</li>
              <li>{t("s3.item2")}</li>
              <li>{t("s3.item3")}</li>
              <li>{t("s3.item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s4.title")}</h2>
            <p className="mb-2">{t("s4.intro")}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("s4.item1")}</li>
              <li>{t("s4.item2")}</li>
              <li>{t("s4.item3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s5.title")}</h2>
            <p>{t("s5.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s6.title")}</h2>
            <p>{t("s6.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s7.title")}</h2>
            <p>{t("s7.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("s8.title")}</h2>
            <p>{t("s8.body")}</p>
          </section>

        </div>
      </div>
    </PageLayout>
  );
}
