import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

function BrandSymbol() {
  return <>
    <path d={brand.tail} className="fill-primary/50" />
    <path d={brand.body} />
    <path d={brand.fold} className="fill-background" />
    <path d={brand.eye} className="fill-background" />
  </>;
}

export function BrandLogo({ className }: { className?: string }) {
  return <svg viewBox={brand.viewBox} role="img" aria-label={brand.name} className={cn("fill-current text-primary", className)}>
    <BrandSymbol />
    <path d={brand.wordmark} />
  </svg>;
}

export function BrandMark({ className }: { className?: string }) {
  return <svg viewBox={brand.markViewBox} aria-hidden="true" className={cn("fill-current text-primary", className)}>
    <BrandSymbol />
  </svg>;
}
