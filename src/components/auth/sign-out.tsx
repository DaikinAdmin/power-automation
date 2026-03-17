"use client";

import { Button } from "../ui/button";
import { authClient, signOut } from "@/lib/auth-client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

const SignOut = () => {
  const locale = useLocale();
  const router = useRouter();
  const session = authClient.useSession();
  const t = useTranslations("header");

  if (!session.data) {
    return (
      <Button
        variant="ghost"
        onClick={() => {
          router.push(`/${locale}/signin`);
        }}
      >
        <LogOut size={16} />
        {t("login")}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className="text-red-500"
      onClick={async () => {
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push(`/${locale}/signin`);
            },
          },
        });
      }}
    >
      <LogOut size={16} />
      {t("logout")}
    </Button>
  );
};

export default SignOut;
