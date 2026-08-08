import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useLocaleDir } from "@/lib/use-locale-dir";

export default function NotFound() {
  const { t } = useTranslation("ui");
  const { dir } = useLocaleDir("ui");

  return (
    <div dir={dir} className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t("notFound.title")}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
            {t("notFound.description")}
          </p>

          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
            {t("notFound.backHome")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
