import { localePath } from "@/utils/constants";
import {
  getMessageFallbackTranslation,
  onErrorTranslation,
} from "@/utils/helpers/translationHelper";
import { Card } from "@nextui-org/card";
import { NextIntlClientProvider } from "next-intl";

interface AuthLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function AuthLayout({
  children,
  params,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-[calc(100svh-4rem)]">
      <div className="m-auto max-w-[500px] md:w-2/5">
        <Card fullWidth>
          <NextIntlClientProvider
            locale={params.locale}
            messages={(await localePath(params.locale)).Auth}
            onError={onErrorTranslation}
            getMessageFallback={getMessageFallbackTranslation}
          >
            {children}
          </NextIntlClientProvider>
        </Card>
      </div>
    </main>
  );
}
