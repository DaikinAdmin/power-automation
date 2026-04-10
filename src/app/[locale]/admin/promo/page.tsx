"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, X, ChevronLeft, ChevronRight } from "lucide-react";

const BADGE_VALUES = [
  "NEW_ARRIVALS",
  "BESTSELLER",
  "HOT_DEALS",
  "LIMITED_EDITION",
  "USED",
  "ABSENT",
] as const;
type BadgeValue = (typeof BADGE_VALUES)[number];

const BADGE_LABELS: Record<BadgeValue, string> = {
  NEW_ARRIVALS: "New Arrivals",
  BESTSELLER: "Bestseller",
  HOT_DEALS: "Hot Deals",
  LIMITED_EDITION: "Limited Edition",
  USED: "Refurbished",
  ABSENT: "None (Remove)",
};

const BADGE_COLORS: Record<BadgeValue, string> = {
  NEW_ARRIVALS: "bg-blue-100 text-blue-800 border-blue-200",
  BESTSELLER: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HOT_DEALS: "bg-red-100 text-red-800 border-red-200",
  LIMITED_EDITION: "bg-purple-100 text-purple-800 border-purple-200",
  USED: "bg-teal-100 text-teal-800 border-teal-200",
  ABSENT: "bg-gray-50 text-gray-400 border-gray-200",
};

interface PriceEntry {
  id: string;
  warehouseId: string;
  price: number;
  quantity: number;
  badge: BadgeValue;
  warehouse: { id: string; name: string; displayedName: string } | null;
}

interface ItemWithBadges {
  id: string;
  articleId: string;
  slug: string;
  alias: string | null;
  itemPrice: PriceEntry[];
  itemDetails: { locale: string; itemName: string }[];
}

export default function PromoPage() {
  const t = useTranslations('adminDashboard');
  const BADGE_LABELS: Record<BadgeValue, string> = {
    NEW_ARRIVALS: t('promo.badges.names.NEW_ARRIVALS'),
    BESTSELLER: t('promo.badges.names.BESTSELLER'),
    HOT_DEALS: t('promo.badges.names.HOT_DEALS'),
    LIMITED_EDITION: t('promo.badges.names.LIMITED_EDITION'),
    USED: t('promo.badges.names.USED'),
    ABSENT: t('promo.badges.names.ABSENT'),
  };
  const [badgeItems, setBadgeItems] = useState<ItemWithBadges[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [badgeFilter, setBadgeFilter] = useState<BadgeValue | null>(null);

  // Edit badge modal
  const [editModal, setEditModal] = useState<{
    open: boolean;
    articleId: string;
    priceEntry: PriceEntry | null;
  }>({ open: false, articleId: "", priceEntry: null });
  const [editBadge, setEditBadge] = useState<BadgeValue>("ABSENT");

  // Assign badge modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignArticleId, setAssignArticleId] = useState("");
  const [assignSearchResult, setAssignSearchResult] =
    useState<ItemWithBadges | null>(null);
  const [assignSearchLoading, setAssignSearchLoading] = useState(false);
  const [assignPriceId, setAssignPriceId] = useState("");
  const [assignBadge, setAssignBadge] = useState<BadgeValue>("NEW_ARRIVALS");

  const fetchBadgedItems = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/items?hasBadge=true&page=${p}&pageSize=20`,
      );
      if (res.ok) {
        const data = await res.json();
        setBadgeItems(data.items ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setPage(p);
      }
    } catch {
      toast.error("Failed to load badged items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgedItems(1);
  }, [fetchBadgedItems]);

  const getBadgedPrices = (item: ItemWithBadges): PriceEntry[] =>
    item.itemPrice.filter((p) => p.badge && p.badge !== "ABSENT");

  const getItemName = (item: ItemWithBadges): string =>
    item.itemDetails?.find((d) => d.locale === "pl")?.itemName ||
    item.itemDetails?.[0]?.itemName ||
    item.alias ||
    item.articleId;

  const filteredRows = badgeItems
    .flatMap((item) => getBadgedPrices(item).map((price) => ({ item, price })))
    .filter(({ price }) => !badgeFilter || price.badge === badgeFilter);

  // --- Edit badge ---
  const handleEditOpen = (articleId: string, priceEntry: PriceEntry) => {
    setEditModal({ open: true, articleId, priceEntry });
    setEditBadge(priceEntry.badge || "ABSENT");
  };

  const handleEditSave = async () => {
    if (!editModal.priceEntry) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/items/bulk-update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              articleId: editModal.articleId,
              price: editModal.priceEntry.price,
              quantity: editModal.priceEntry.quantity,
              badge: editBadge,
            },
          ],
          warehouseId: editModal.priceEntry.warehouseId,
        }),
      });
      if (res.ok) {
        toast.success("Badge updated");
        setEditModal({ open: false, articleId: "", priceEntry: null });
        fetchBadgedItems(page);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update badge");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBadge = async (
    articleId: string,
    priceEntry: PriceEntry,
  ) => {
    if (
      !confirm(
        `Remove badge from "${articleId}" (${priceEntry.warehouse?.displayedName || priceEntry.warehouse?.name})?`,
      )
    )
      return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/items/bulk-update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              articleId,
              price: priceEntry.price,
              quantity: priceEntry.quantity,
              badge: "ABSENT",
            },
          ],
          warehouseId: priceEntry.warehouseId,
        }),
      });
      if (res.ok) {
        toast.success("Badge removed");
        fetchBadgedItems(page);
      } else {
        toast.error("Failed to remove badge");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // --- Assign badge ---
  const handleAssignSearch = async () => {
    const query = assignArticleId.trim();
    if (!query) return;
    setAssignSearchLoading(true);
    setAssignSearchResult(null);
    try {
      const res = await fetch(
        `/api/admin/items?search=${encodeURIComponent(query)}&pageSize=5`,
      );
      if (res.ok) {
        const data = await res.json();
        const found: ItemWithBadges | undefined = data.items?.find(
          (i: ItemWithBadges) => i.articleId === query,
        );
        if (found) {
          setAssignSearchResult(found);
          const firstPrice = found.itemPrice?.[0];
          if (firstPrice) setAssignPriceId(firstPrice.id);
        } else {
          toast.error("Item not found");
        }
      }
    } finally {
      setAssignSearchLoading(false);
    }
  };

  const handleAssignSave = async () => {
    if (!assignSearchResult || !assignPriceId) return;
    const priceEntry = assignSearchResult.itemPrice.find(
      (p) => p.id === assignPriceId,
    );
    if (!priceEntry) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/items/bulk-update-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              articleId: assignSearchResult.articleId,
              price: priceEntry.price,
              quantity: priceEntry.quantity,
              badge: assignBadge,
            },
          ],
          warehouseId: priceEntry.warehouseId,
        }),
      });
      if (res.ok) {
        toast.success("Badge assigned");
        resetAssignModal();
        fetchBadgedItems(page);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to assign badge");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const resetAssignModal = () => {
    setAssignModal(false);
    setAssignArticleId("");
    setAssignSearchResult(null);
    setAssignPriceId("");
    setAssignBadge("NEW_ARRIVALS");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('promo.title')}</h1>
        <p className="text-gray-600">{t('promo.description')}</p>
      </div>

      <Tabs defaultValue="badges">
        <TabsList>
          <TabsTrigger value="promos">{t('promo.tabs.promos')}</TabsTrigger>
          <TabsTrigger value="badges">{t('promo.tabs.badges')}</TabsTrigger>
        </TabsList>

        {/* Promos tab — placeholder */}
        <TabsContent value="promos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('promo.promos.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">{t('promo.promos.comingSoon')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges tab */}
        <TabsContent value="badges" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{t('promo.badges.title')}</h2>
                <Select
                  value={badgeFilter ?? "ALL"}
                  onValueChange={(v) =>
                    setBadgeFilter(v === "ALL" ? null : (v as BadgeValue))
                  }
                >
                  <SelectTrigger className="w-44 h-8 text-sm">
                    <SelectValue placeholder={t('promo.badges.allBadges')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('promo.badges.allBadges')}</SelectItem>
                    {BADGE_VALUES.filter((v) => v !== "ABSENT").map((v) => (
                      <SelectItem key={v} value={v}>
                        {BADGE_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setAssignModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('promo.badges.assignBadge')}
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-10 text-center text-gray-500">
                    {t('promo.badges.loading')}
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="p-10 text-center text-gray-500">
                    {t('promo.badges.empty')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('promo.badges.table.articleId')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('promo.badges.table.name')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('promo.badges.table.badge')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('promo.badges.table.warehouse')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('promo.badges.table.priceQty')}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('promo.badges.table.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRows.map(({ item, price }) => (
                          <tr
                            key={`${item.id}-${price.id}`}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-sm text-gray-900">
                              {item.articleId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                              {getItemName(item)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  BADGE_COLORS[price.badge] ??
                                  "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                              >
                                {BADGE_LABELS[price.badge] ?? price.badge}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {price.warehouse?.displayedName ||
                                price.warehouse?.name ||
                                price.warehouseId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {price.price} / {price.quantity}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex gap-1.5 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleEditOpen(item.articleId, price)
                                  }
                                  title="Edit badge"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                                  onClick={() =>
                                    handleRemoveBadge(item.articleId, price)
                                  }
                                  title="Remove badge"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => fetchBadgedItems(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => fetchBadgedItems(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Badge Modal */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) =>
          !open && setEditModal((prev) => ({ ...prev, open: false }))
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('promo.editBadge.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-500">{t('promo.editBadge.articleId')}</Label>
              <p className="mt-0.5 font-mono text-sm font-medium">
                {editModal.articleId}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">{t('promo.editBadge.warehouse')}</Label>
              <p className="mt-0.5 text-sm">
                {editModal.priceEntry?.warehouse?.displayedName ||
                  editModal.priceEntry?.warehouse?.name}
              </p>
            </div>
            <div>
              <Label>{t('promo.editBadge.badge')}</Label>
              <Select
                value={editBadge}
                onValueChange={(v) => setEditBadge(v as BadgeValue)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BADGE_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {BADGE_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}
            >
              {t('promo.editBadge.cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving ? t('promo.editBadge.saving') : t('promo.editBadge.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Badge Modal */}
      <Dialog
        open={assignModal}
        onOpenChange={(open) => !open && resetAssignModal()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('promo.assignBadge.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('promo.assignBadge.articleId')}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={assignArticleId}
                  onChange={(e) => {
                    setAssignArticleId(e.target.value);
                    setAssignSearchResult(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAssignSearch()}
                  placeholder={t('promo.assignBadge.placeholder')}
                />
                <Button
                  variant="outline"
                  onClick={handleAssignSearch}
                  disabled={assignSearchLoading || !assignArticleId.trim()}
                >
                  {assignSearchLoading ? t('promo.assignBadge.searching') : t('promo.assignBadge.search')}
                </Button>
              </div>
            </div>

            {assignSearchResult && (
              <>
                <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm text-gray-700">
                  <span className="font-medium">
                    {getItemName(assignSearchResult)}
                  </span>
                  <span className="text-gray-400 ml-2 font-mono text-xs">
                    {assignSearchResult.articleId}
                  </span>
                </div>

                <div>
                  <Label>{t('promo.assignBadge.pricingVariant')}</Label>
                  <Select
                    value={assignPriceId}
                    onValueChange={setAssignPriceId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignSearchResult.itemPrice.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.warehouse?.displayedName ||
                            p.warehouse?.name ||
                            p.warehouseId}
                          {" — "}
                          {p.price} (qty: {p.quantity})
                          {p.badge && p.badge !== "ABSENT" && (
                            <span className="ml-1 text-xs text-orange-500">
                              [{p.badge}]
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('promo.assignBadge.badge')}</Label>
                  <Select
                    value={assignBadge}
                    onValueChange={(v) => setAssignBadge(v as BadgeValue)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BADGE_VALUES.filter((v) => v !== "ABSENT").map((v) => (
                        <SelectItem key={v} value={v}>
                          {BADGE_LABELS[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAssignModal}>
              {t('promo.assignBadge.cancel')}
            </Button>
            <Button
              onClick={handleAssignSave}
              disabled={isSaving || !assignSearchResult || !assignPriceId}
            >
              {isSaving ? t('promo.assignBadge.saving') : t('promo.assignBadge.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
