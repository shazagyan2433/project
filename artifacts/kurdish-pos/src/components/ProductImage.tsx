import { PackageOpen } from "lucide-react";

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

const iconMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function ProductImage({ src, alt = "product", size = "md", className = "" }: ProductImageProps) {
  const sizeClass = sizeMap[size];
  const iconClass = iconMap[size];

  if (!src) {
    return (
      <div className={`${sizeClass} rounded-xl bg-slate-100 flex items-center justify-center shrink-0 ${className}`}>
        <PackageOpen className={`${iconClass} text-slate-300`} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClass} rounded-xl object-cover shrink-0 border border-slate-100 ${className}`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
