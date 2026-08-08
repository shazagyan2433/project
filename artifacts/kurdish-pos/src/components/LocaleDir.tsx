import type { ReactNode } from "react";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { cn } from "@/lib/utils";

/** Wraps page content with correct `dir` for the active language (RTL for ku/ar, LTR for en). */
export function LocaleDir({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main";
}) {
  const { dir } = useLocaleDir();
  return <Tag dir={dir} className={cn(className)}>{children}</Tag>;
}
