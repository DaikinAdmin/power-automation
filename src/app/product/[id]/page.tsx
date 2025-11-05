'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GitCompare, Heart, MessageSquare, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import PageLayout from '@/components/layout/page-layout';
import WarehouseSelector from '@/components/warehouse-selector';
import { WarehouseAvailability } from '@/components/warehouse-availability';
import { calculateDiscountPercentage } from '@/helpers/pricing';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/components/cart-context';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import type {
  CartItemType,
  ProductDetailsResponse,
  ProductWarehouse,
} from '@/helpers/types/item';

const badgeLabels: Record<string, string> = {
  new: 'NEW',
  bestseller: 'BESTSELLER',
  discount: 'DISCOUNT',
};

const priceBadgeLabels: Record<string, string> = {
  BESTSELLER: 'Bestseller',
  HOT_DEALS: 'Hot Deal',
  NEW_ARRIVALS: 'New',
  LIMITED_EDITION: 'Limited',
  ABSENT: 'Standard',
};

type SelectorWarehouse = Omit<ProductWarehouse, 'specialPrice'> & {
  id: string;
  specialPrice?: string;
  basePrice: number;
  baseSpecialPrice?: number;
};

const parsePriceValue = (value?: string | null): number | null => {
  if (!value) return null;
  const normalized = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const showAskPrice = searchParams.get('askPrice') === 'true';
  const { formatPriceFromBase } = useCurrency();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<'delivery' | 'warranty' | 'documents'>('delivery');
  const [opinionForm, setOpinionForm] = useState({ name: '', email: '', opinion: '' });
  const [product, setProduct] = useState<ProductDetailsResponse | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAskPriceModal, setShowAskPriceModal] = useState(false);
  const [askPriceForm, setAskPriceForm] = useState({
    warehouseId: '',
    quantity: 1,
    comment: ''
  });
  const [isSubmittingPriceRequest, setIsSubmittingPriceRequest] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/items/en/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch product: ${response.status}`);
        }

        const data: ProductDetailsResponse = await response.json();
        setProduct(data);

        const recommended = data.recommendedWarehouse?.warehouse
          ? data.warehouses.find((w) => w.warehouseId === data.recommendedWarehouse?.warehouse.id)
          : data.warehouses[0];
        setSelectedWarehouseId(recommended?.warehouseId ?? null);
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct().catch(() => undefined);
  }, [id]);

  const availableWarehousesForCart = useMemo(() => {
    if (!product) return [];
    return product.warehouses.map((warehouse) => {

      return {
      warehouseId: warehouse.warehouseId,
      warehouseName: warehouse.warehouseName,
      warehouseCountry: warehouse.warehouseCountry,
      displayName: warehouse.displayedName,
      price: parsePriceValue(warehouse.price)!,
      specialPrice: parsePriceValue(warehouse.specialPrice)!,
      inStock: warehouse.inStock,
      quantity: warehouse.quantity,
    };
    });
  }, [product]);

  const selectorWarehouses = useMemo<SelectorWarehouse[]>(() => {
    if (!product) return [];
    return product.warehouses.map((warehouse, index) => {
      const basePrice = parsePriceValue(warehouse.price) ?? 0;
      const baseSpecialPrice = warehouse.specialPrice ? parsePriceValue(warehouse.specialPrice) ?? undefined : undefined;

      return {
        id: `${product.id}-${warehouse.warehouseId}-${index}`,
        ...warehouse,
        price: formatPriceFromBase(basePrice),
        specialPrice: baseSpecialPrice !== undefined ? formatPriceFromBase(baseSpecialPrice) : undefined,
        basePrice,
        baseSpecialPrice,
      };
    });
  }, [product, formatPriceFromBase]);

  useEffect(() => {
    if (showAskPrice) {
      setShowAskPriceModal(true);
    }
  }, [showAskPrice]);

  useEffect(() => {
    if (!product) return;
    const defaultWarehouse = product.recommendedWarehouse?.warehouse
      ? product.warehouses.find((w) => w.warehouseId === product.recommendedWarehouse?.warehouse.id)
      : product.warehouses[0];
    setSelectedWarehouseId((prev) => prev ?? defaultWarehouse?.warehouseId ?? null);
    // Set default warehouse for ask price form
    setAskPriceForm(prev => ({
      ...prev,
      warehouseId: prev.warehouseId || defaultWarehouse?.warehouseId || ''
    }));
  }, [product]);

  const selectedWarehouse = useMemo(() => {
    if (!selectorWarehouses.length) return null;
    const found = selectorWarehouses.find((warehouse) => warehouse.warehouseId === selectedWarehouseId);
    return found ?? selectorWarehouses[0];
  }, [selectorWarehouses, selectedWarehouseId]);

  const resolvedDetail = useMemo(() => {
    if (!product) return null;
    const details = product.itemDetails || [];
    return details.find((detail) => detail.locale === 'en') || details[0] || null;
  }, [product]);

  const productName = resolvedDetail?.itemName || product?.name || 'Unnamed Product';
  const resolvedDetailLocale = resolvedDetail?.locale || 'en';

  const handleOpinionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setOpinionForm({ name: '', email: '', opinion: '' });
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (isAddingToCart || !product || !selectedWarehouse) {
      return;
    }

    setIsAddingToCart(true);

    try {
      if (selectedWarehouse.inStock) {
        const basePrice = selectedWarehouse.basePrice ?? parsePriceValue(selectedWarehouse.price) ?? 0;
        const baseSpecialPrice = selectedWarehouse.baseSpecialPrice ?? (selectedWarehouse.specialPrice ? parsePriceValue(selectedWarehouse.specialPrice) ?? undefined : undefined);
        const specialPrice = baseSpecialPrice;

        const now = new Date();

        const cartItem: Omit<CartItemType, 'quantity'> = {
          id: product.id,
          articleId: product.articleId,
          isDisplayed: product.isDisplayed,
          itemImageLink: product.itemImageLink || product.image || '',
          categoryId: product.categoryId,
          subCategoryId: product.subCategoryId,
          brandId: product.brandId ?? null,
          brandName: product.brand,
          warrantyType: product.warrantyType ?? null,
          warrantyLength: product.warrantyMonths ?? null,
          sellCounter: product.sellCounter ?? 0,
          createdAt: now,
          updatedAt: now,
          category: {
            id: product.categoryId,
            name: product.category,
            slug: product.categorySlug,
            isVisible: true,
            createdAt: now,
            updatedAt: now,
            subCategories: [],
          },
          subCategory: {
            id: product.subCategoryId,
            name: product.subcategory,
            slug: `${product.categorySlug}-${product.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            categoryId: product.categoryId,
            isVisible: true,
            createdAt: now,
            updatedAt: now,
          },
          brand: product.brandId
            ? {
                id: product.brandId,
                name: product.brand,
                alias: product.brandAlias || '',
                imageLink: product.brandImage || '',
                isVisible: true,
                createdAt: now,
                updatedAt: now,
              }
            : null,
          itemDetails: [
            {
              id: '',
              itemId: product.id,
              locale: resolvedDetailLocale,
              itemName: productName,
              description: product.description,
              specifications: resolvedDetail?.specifications ?? '',
              seller: resolvedDetail?.seller ?? '',
              discount: resolvedDetail?.discount ?? null,
              popularity: resolvedDetail?.popularity ?? null,
            },
          ],
          itemPrice: [],
          price: (specialPrice ?? basePrice),
          specialPrice,
          basePrice,
          warehouseId: selectedWarehouse.warehouseId,
          displayName: productName,
          availableWarehouses: availableWarehousesForCart,
        };

        addToCart(cartItem);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setTimeout(() => setIsAddingToCart(false), 400);
    }
  };

  const handleAskForPrice = async () => {
    if (!product || !askPriceForm.warehouseId || isSubmittingPriceRequest) {
      return;
    }

    setIsSubmittingPriceRequest(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: product.id,
          warehouseId: askPriceForm.warehouseId,
          quantity: askPriceForm.quantity,
          comment: askPriceForm.comment,
          price: 0,
          isPriceRequest: true,
          status: 'ASK_FOR_PRICE',
        }),
      });

      if (response.ok) {
        setShowAskPriceModal(false);
        setAskPriceForm({ warehouseId: '', quantity: 1, comment: '' });
        // You might want to show a success message here
        alert('Price request submitted successfully! We will contact you soon.');
      } else {
        throw new Error('Failed to submit price request');
      }
    } catch (error) {
      console.error('Error submitting price request:', error);
      alert('Failed to submit price request. Please try again.');
    } finally {
      setIsSubmittingPriceRequest(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">Loading product…</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!product) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-800">Product Not Found</h1>
            <p className="mb-6 text-gray-600">The product you are looking for is unavailable or has been removed.</p>
            <Link href="/" className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
              Back to Home
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const imageSrc = product.image || product.itemImageLink || '/imgs/placeholder-product.jpg';
  const warehouseLabel = selectedWarehouse ? `From ${selectedWarehouse.displayedName}` : undefined;
  const warehouseExtraLabel = selectedWarehouse && product.warehouses.length > 1
    ? `+${product.warehouses.length - 1} more locations`
    : undefined;

  const basePriceNumber = selectedWarehouse?.basePrice ?? 0;
  const specialPriceNumber = selectedWarehouse?.baseSpecialPrice;

  const formattedPrice = formatPriceFromBase(specialPriceNumber ?? basePriceNumber);
  const formattedOriginalPrice = specialPriceNumber ? formatPriceFromBase(basePriceNumber) : undefined;
  const discountLabel = specialPriceNumber ? calculateDiscountPercentage(basePriceNumber, specialPriceNumber) : null;

  return (
    <PageLayout>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="relative mx-auto max-w-md">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img src={imageSrc} alt={productName} className="h-full w-full object-cover" />
              </div>

              {product.badge && (
                <div className="absolute left-4 top-4">
                  <span
                    className={`rounded px-3 py-1 text-sm font-semibold text-white ${
                      product.badge === 'bestseller'
                        ? 'bg-yellow-500'
                        : product.badge === 'discount'
                        ? 'bg-red-500'
                        : 'bg-green-600'
                    }`}
                  >
                    {badgeLabels[product.badge]}
                  </span>
                </div>
              )}
            </div>

            {selectorWarehouses.length > 0 && selectedWarehouse && (
              <WarehouseSelector
                warehouses={selectorWarehouses}
                selectedWarehouse={selectedWarehouse}
                onWarehouseChange={(warehouse) => setSelectedWarehouseId(warehouse.warehouseId)}
                itemId={product.id}
                itemName={productName}
              />
            )}

            <div className="rounded-lg border">
              <div className="flex border-b">
                {['delivery', 'warranty', 'documents'].map((tab) => (
                  <button
                    key={tab}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      activeTab === tab ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'
                    }`}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                  >
                    {tab === 'delivery' ? 'Delivery & Availability' : tab === 'warranty' ? 'Warranty' : 'Documents'}
                  </button>
                ))}
              </div>
              <div className="p-4 text-sm text-gray-600">
                {activeTab === 'delivery' && (
                  <>
                    <p>Delivery available within 3-5 business days from the selected warehouse.</p>
                    <p className="mt-2">Need faster shipping? Contact our logistics team for express options.</p>
                  </>
                )}
                {activeTab === 'warranty' && (
                  <>
                    <p>Manufacturer warranty: {product.warrantyMonths ? `${product.warrantyMonths} months` : 'Not specified'}.</p>
                    <p className="mt-2">Additional service contracts available upon request.</p>
                  </>
                )}
                {activeTab === 'documents' && (
                  <p>Datasheets and certificates are available upon request. Contact support for more information.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{productName}</h1>
              <p className="mt-2 text-sm text-gray-500">Article ID: {product.articleId}</p>
            </div>

            <div className="rounded-lg border p-6">
              <div className="flex items-baseline gap-4">
                <div className="text-3xl font-bold text-gray-900">{formattedPrice}</div>
                {formattedOriginalPrice && (
                  <div className="text-sm text-gray-500 line-through">{formattedOriginalPrice}</div>
                )}
                {discountLabel && (
                  <UiBadge variant="destructive">-{discountLabel}%</UiBadge>
                )}
                {selectedWarehouse?.badge && (
                  <UiBadge variant="secondary">
                    {priceBadgeLabels[selectedWarehouse.badge] || 'Promo'}
                  </UiBadge>
                )}
              </div>

              {selectedWarehouse && (
                <WarehouseAvailability
                  variant="detail"
                  inStock={selectedWarehouse.inStock}
                  quantity={selectedWarehouse.quantity}
                  locationLabel={warehouseLabel}
                  extraLabel={warehouseExtraLabel}
                  className="mt-4"
                />
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedWarehouse?.inStock || isAddingToCart}
                  className={`flex-1 rounded-lg px-6 py-3 text-white shadow transition-colors ${
                    selectedWarehouse?.inStock
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {selectedWarehouse?.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
                <button 
                  onClick={() => setShowAskPriceModal(true)}
                  className="flex h-12 items-center justify-center rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="hidden sm:inline">Ask Price</span>
                </button>
                <button className="flex h-12 w-12 items-center justify-center rounded-lg border hover:bg-gray-50">
                  <Heart className="h-5 w-5" />
                </button>
                <button className="flex h-12 w-12 items-center justify-center rounded-lg border hover:bg-gray-50">
                  <GitCompare className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Product Details</h2>
              <p className="text-sm text-gray-600">{product.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Brand:</span> {product.brand || '—'}
                </div>
                <div>
                  <span className="font-medium">Warranty:</span>{' '}
                  {product.warrantyMonths ? `${product.warrantyMonths} months` : '—'}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {product.category}
                </div>
                <div>
                  <span className="font-medium">Subcategory:</span> {product.subcategory}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-6">
              <h3 className="text-lg font-semibold">Leave Your Opinion</h3>
              <form className="mt-4 space-y-3" onSubmit={handleOpinionSubmit}>
                <input
                  type="text"
                  value={opinionForm.name}
                  onChange={(e) => setOpinionForm({ ...opinionForm, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <input
                  type="email"
                  value={opinionForm.email}
                  onChange={(e) => setOpinionForm({ ...opinionForm, email: e.target.value })}
                  placeholder="Email"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <textarea
                  value={opinionForm.opinion}
                  onChange={(e) => setOpinionForm({ ...opinionForm, opinion: e.target.value })}
                  placeholder="Share your experience"
                  rows={3}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <button type="submit" className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700">
                  Submit Opinion
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Ask for Price Modal */}
      <Dialog open={showAskPriceModal} onOpenChange={setShowAskPriceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ask for Price</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product</label>
              <p className="text-sm text-gray-600">{productName}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Warehouse</label>
              <select
                value={askPriceForm.warehouseId}
                onChange={(e) => setAskPriceForm(prev => ({ ...prev, warehouseId: e.target.value }))}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Select warehouse</option>
                {selectorWarehouses.map((warehouse) => (
                  <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                    {warehouse.displayedName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <Input
                type="number"
                min="1"
                value={askPriceForm.quantity}
                onChange={(e) => setAskPriceForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Comment (optional)</label>
              <Textarea
                value={askPriceForm.comment}
                onChange={(e) => setAskPriceForm(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Any specific requirements or questions..."
                rows={3}
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAskPriceModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAskForPrice}
                disabled={!askPriceForm.warehouseId || isSubmittingPriceRequest}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSubmittingPriceRequest ? 'Submitting...' : 'Ask for Price'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
