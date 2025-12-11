import { Badge as UiBadge } from '@/components/ui/badge';

interface ProductImageProps {
  imageSrc: string[];
  productName: string;
  badge?: string | null;
}

const badgeLabels: Record<string, string> = {
  new: 'NEW',
  bestseller: 'BESTSELLER',
  discount: 'DISCOUNT',
};

export function ProductImage({ imageSrc, productName, badge }: ProductImageProps) {
  return (
    <div className="relative mx-auto max-w-md">
      <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
        {
          imageSrc.length === 0 ? (
            imageSrc.map((src, index) => (
              <img src={src} alt={productName} key={index} className="h-full w-full object-cover" />
          ))) : (
            <></>
          )
        }
        
      </div>

      {badge && (
        <div className="absolute left-4 top-4">
          <span
            className={`rounded px-3 py-1 text-sm font-semibold text-white ${
              badge === 'bestseller'
                ? 'bg-yellow-500'
                : badge === 'discount'
                ? 'bg-red-500'
                : 'bg-green-600'
            }`}
          >
            {badgeLabels[badge]}
          </span>
        </div>
      )}
    </div>
  );
}
