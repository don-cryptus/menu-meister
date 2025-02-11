"use client";

import { LogoSwitch } from "@/components/utils/LogoSwitch";
import { Button } from "@nextui-org/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface HomePageProps {}

export default function HomePage({}: HomePageProps) {
  const t = useTranslations<"Home">();

  return (
    <>
      <div className="h-16" />
      <LogoSwitch />
      <h1 className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-3xl font-bold leading-relaxed text-transparent dark:from-secondary dark:to-primary">
        {process.env.NEXT_PUBLIC_BRAND_NAME}
      </h1>
      <h5 className="max-w-2xl text-center text-3xl font-bold md:text-6xl">
        {t("HEADER")}
      </h5>
      <p className="my-10 max-w-2xl text-center text-lg text-gray-700 dark:text-gray-400 md:text-xl">
        {t("SUBHEADER", { brand: process.env.NEXT_PUBLIC_BRAND_NAME })}
      </p>

      <div className="mt-4 flex w-full items-center justify-center space-x-10">
        <Link href="/login">
          <Button size="lg" color="primary" radius="sm" variant="shadow">
            {t("LOGIN_BUTTON")}
          </Button>
        </Link>
        <Link href="/register">
          <Button size="lg" radius="sm" variant="bordered">
            {t("REGISTER_BUTTON")}
          </Button>
        </Link>
      </div>
    </>
  );
}
