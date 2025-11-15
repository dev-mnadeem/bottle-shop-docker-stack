import Image from 'next/image';
import { formatPrice, type Product } from '../lib/products';
import { resolveProductImageUrl } from '../lib/images';
import { Badge, Card } from './ui/Card';

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-canvas">
        <Image
          src={resolveProductImageUrl(product.imageUrl)}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          /* Only the first row is eager — marking every card priority defeats the
             point and makes Next warn about too many priority images. */
          priority={priority}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight text-ink">{product.name}</h3>
          <Badge aria-label={`Price ${formatPrice(product.priceCents)}`}>
            {formatPrice(product.priceCents)}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted">{product.shortDescription}</p>
      </div>
    </Card>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card aria-hidden="true" className="overflow-hidden">
      <div className="aspect-[4/3] w-full animate-pulse bg-line/60" />
      <div className="space-y-2.5 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-line/60" />
        <div className="h-3 w-full animate-pulse rounded bg-line/60" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-line/60" />
      </div>
    </Card>
  );
}
