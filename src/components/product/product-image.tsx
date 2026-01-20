import { Badge as UiBadge } from "@/components/ui/badge";

interface ProductImageProps {
  imageSrc: string[];
  productName: string;
  badge?: string | null;
}

const badgeLabels: Record<string, string> = {
  new: "NEW",
  bestseller: "BESTSELLER",
  discount: "DISCOUNT",
};

export function ProductImage({
  imageSrc,
  productName,
  badge,
}: ProductImageProps) {
  const imageUrl =
    imageSrc && imageSrc.length > 0
      ? imageSrc[0]
      : "/imgs/placeholder-product.jpg";

  return (
    <div className="relative mx-auto w-full">
      <div className="overflow-hidden rounded-lg bg-gray-100 h-64 w-full">
        <img
          src={imageUrl}
          alt={productName}
          className="w-full h-full object-cover"
        />
      </div>

      {badge && (
        <div className="absolute left-4 top-4">
          <span
            className={`rounded px-3 py-1 text-sm font-semibold text-white ${
              badge === "bestseller"
                ? "bg-yellow-500"
                : badge === "discount"
                ? "bg-red-500"
                : "bg-green-600"
            }`}
          >
            {badgeLabels[badge]}
          </span>
        </div>
      )}
    </div>
  );
}
