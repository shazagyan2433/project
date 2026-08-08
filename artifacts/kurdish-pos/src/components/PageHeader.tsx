import { cn } from "@/lib/utils";
import { PAGE_TITLE, PAGE_SUBTITLE } from "@/lib/page-theme";
import { usePageHeader, type PageHeaderId } from "@/lib/page-headers";

interface PageHeaderProps {
  id: PageHeaderId;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showDescription?: boolean;
}

export function PageHeader({
  id,
  className,
  titleClassName,
  subtitleClassName,
  showDescription = true,
}: PageHeaderProps) {
  const { title, description } = usePageHeader(id);

  return (
    <div className={className}>
      <h1 className={cn("text-2xl linqi-page-header-title", PAGE_TITLE, titleClassName)}>{title}</h1>
      {showDescription && description && (
        <p className={cn(PAGE_SUBTITLE, "linqi-page-header-subtitle", subtitleClassName)}>{description}</p>
      )}
    </div>
  );
}
