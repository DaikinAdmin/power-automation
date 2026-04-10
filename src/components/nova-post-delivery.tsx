"use client";
import { useState, useEffect, useRef } from "react";
import type {
  DeliveryMethod,
  PaymentMethod,
  NpCity,
  NpWarehouse,
  NovaPostDeliveryState,
  CardOption,
  InputProps,
} from "@/types/nova-poshta";
import { useDebounce } from "@/hooks/useDebounce";
import { getDeliveryOptions, getPaymentOptions } from "@/constants/nova-poshta";
import { useTranslations } from "next-intl";

export type { DeliveryMethod, PaymentMethod, NpCity, NovaPostDeliveryState };

function CardSelector<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: CardOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5">
      {label && (
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
          {label}
        </label>
      )}
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                selected
                  ? "border-red-500 bg-red-50 text-red-600 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50/40"
              }`}
            >
              <span className={`flex-shrink-0 ${selected ? "text-red-500" : "text-gray-400"}`}>
                {opt.icon}
              </span>
              <span className="flex flex-col flex-1">
                <span className="text-sm font-semibold leading-tight">{opt.label}</span>
                {opt.description && (
                  <span className={`text-xs leading-tight ${selected ? "text-red-400" : "text-gray-400"}`}>
                    {opt.description}
                  </span>
                )}
              </span>
              {selected && (
                <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CityAutocomplete({
  value,
  onSelect,
}: {
  value: NpCity | null;
  onSelect: (city: NpCity | null) => void;
}) {
  const t = useTranslations('novaPostDelivery');
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<NpCity[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/nova-poshta/cities?q=${encodeURIComponent(debouncedQuery)}&limit=15`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="mb-5 relative" ref={ref}>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
        {t("city")}
      </label>
      <input
        type="text"
        placeholder={t("startTypingCityName")}
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onSelect(null);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg outline-none transition focus:border-red-400 box-border"
      />
      {loading && (
        <span className="absolute right-3 top-10 text-xs text-gray-400 animate-pulse">
          {t("searching")}…
        </span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 sm:max-h-56 overflow-auto text-sm">
          {results.map((c) => (
            <li
              key={c.ref}
              className="px-4 py-3 cursor-pointer hover:bg-red-50 active:bg-red-100 flex justify-between"
              onMouseDown={() => {
                onSelect(c);
                setQuery(c.name);
                setOpen(false);
              }}
            >
              <span>{c.name}</span>
              <span className="text-gray-400 text-xs self-center ml-2 shrink-0">{c.settlementType}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WarehouseSelect({
  cityRef,
  value,
  onChange,
}: {
  cityRef: string;
  value: string;
  onChange: (ref: string, description: string) => void;
}) {
  const t = useTranslations('novaPostDelivery');
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [warehouses, setWarehouses] = useState<NpWarehouse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityRef) {
      setWarehouses([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ cityRef, limit: "100" });
    if (debouncedSearch) params.set("q", debouncedSearch);
    fetch(`/api/nova-poshta/warehouses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWarehouses(data);
      })
      .finally(() => setLoading(false));
  }, [cityRef, debouncedSearch]);

  return (
    <div className="mb-5">
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
        {t("warehouseOrPostomat")}
      </label>
      <input
        type="text"
        placeholder={t("searchByNumberOrAddress")}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange("", "");
        }}
        className="w-full px-4 py-3 text-sm bg-gray-50 border-2 border-gray-200 rounded-lg outline-none focus:border-red-400 mb-2 box-border"
      />
      {loading && <p className="text-xs text-gray-400 mb-2 animate-pulse">{t("loading")}…</p>}
      {!loading && cityRef && warehouses.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">{t("nothingFound")}</p>
      )}
      {!cityRef && <p className="text-xs text-gray-400 mb-2">{t("selectCityFirst")}</p>}
      {warehouses.length > 0 && (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              const w = warehouses.find((x) => x.ref === e.target.value);
              onChange(e.target.value, w?.description ?? "");
            }}
            className="w-full px-4 py-3 pr-10 text-sm text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg appearance-none outline-none cursor-pointer transition focus:border-red-400"
          >
            <option value="" disabled>{t("selectWarehouse")}</option>
            {warehouses.map((w) => (
              <option key={w.ref} value={w.ref}>{w.description}</option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">▾</span>
        </div>
      )}
    </div>
  );
}

const Input: React.FC<InputProps> = ({ label, placeholder, value, onChange }) => (
    <div className="mb-5">
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg outline-none transition focus:border-red-400 box-border"
      />
    </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

export default function NovaPostDelivery({
  onChange,
  initialState,
}: {
  onChange?: (state: NovaPostDeliveryState) => void;
  initialState?: Partial<NovaPostDeliveryState> | null;
}) {
  const t = useTranslations('novaPostDelivery');
  const deliveryOptions = getDeliveryOptions(t as (key: string) => string);
  const paymentOptions = getPaymentOptions(t as (key: string) => string);
  const [method, setMethod] = useState<DeliveryMethod>("");
  const [city, setCity] = useState<NpCity | null>(null);
  const [warehouseRef, setWarehouseRef] = useState<string>("");
  const [warehouseDesc, setWarehouseDesc] = useState<string>("");
  const [street, setStreet] = useState<string>("");
  const [building, setBuilding] = useState<string>("");
  const [flat, setFlat] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethod>("");

  const initializedRef = useRef(false);

  // Prefill from last delivery (runs once when initialState first becomes available)
  useEffect(() => {
    if (!initialState || initializedRef.current) return;
    initializedRef.current = true;
    if (initialState.method) setMethod(initialState.method);
    if (initialState.city) setCity(initialState.city);
    if (initialState.warehouseRef) setWarehouseRef(initialState.warehouseRef);
    if (initialState.warehouseDesc) setWarehouseDesc(initialState.warehouseDesc);
    if (initialState.street) setStreet(initialState.street);
    if (initialState.building) setBuilding(initialState.building);
    if (initialState.flat) setFlat(initialState.flat);
    // Intentionally not prefilling payment — user should choose fresh
  }, [initialState]);

  const deliveryFilled =
    method === "warehouse" ||
    (method === "nova_dept" && !!warehouseRef) ||
    (method === "nova_courier" && !!city && !!street && !!building);

  const isValid = deliveryFilled && !!payment;

  useEffect(() => {
    onChange?.({ method, payment, city, warehouseRef, warehouseDesc, street, building, flat, isValid });
  }, [method, payment, city, warehouseRef, warehouseDesc, street, building, flat, isValid]);

  const handleMethodChange = (val: DeliveryMethod): void => {
    setMethod(val);
    setCity(null);
    setWarehouseRef("");
    setWarehouseDesc("");
    setStreet("");
    setBuilding("");
    setFlat("");
    setPayment("");
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200">
      {/* Step 1 — Delivery */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
          1
        </span>
        <span className="text-sm font-semibold text-gray-700">{t("deliveryMethod")}</span>
      </div>

      <CardSelector<DeliveryMethod>
        label=""
        options={deliveryOptions}
        value={method}
        onChange={handleMethodChange}
      />

      {/* Delivery details */}
      {method === "nova_dept" && (
        <div className="p-4 sm:p-5 bg-red-50 rounded-xl border-2 border-red-100 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {t("novaPostOffice")}
          </div>
          <CityAutocomplete
            value={city}
            onSelect={(c) => {
              setCity(c);
              setWarehouseRef("");
              setWarehouseDesc("");
            }}
          />
          <WarehouseSelect
            cityRef={city?.ref ?? ""}
            value={warehouseRef}
            onChange={(ref, desc) => {
              setWarehouseRef(ref);
              setWarehouseDesc(desc);
            }}
          />
        </div>
      )}

      {method === "nova_courier" && (
        <div className="p-4 sm:p-5 bg-red-50 rounded-xl border-2 border-red-100 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {t("novaPostCourier")}
          </div>
          <CityAutocomplete value={city} onSelect={setCity} />
          <Input label={t("street")} placeholder={t("streetPlaceholder")} value={street} onChange={setStreet} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("building")} placeholder={t("buildingPlaceholder")} value={building} onChange={setBuilding} />
            <Input label={t("apartmentOrOffice")} placeholder={t("apartmentOrOfficePlaceholder")} value={flat} onChange={setFlat} />
          </div>
        </div>
      )}

      {method === "warehouse" && (
        <div className="flex gap-3 p-4 bg-red-50 border-2 border-red-100 rounded-xl mb-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <p className="m-0 mb-1 text-sm font-semibold text-red-700">{t("warehousePickup")}</p>
            <p className="m-0 text-sm text-red-500 leading-snug">
              м. Житомир, вул. Київська, 111
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — Payment */}
      {method && (
        <>
          <div className="h-px bg-gradient-to-r from-gray-200 to-transparent mb-5" />
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              2
            </span>
            <span className="text-sm font-semibold text-gray-700">{t("paymentMethod")}</span>
          </div>
          <CardSelector<PaymentMethod>
            label=""
            options={paymentOptions[method]}
            value={payment}
            onChange={setPayment}
          />
        </>
      )}
    </div>
  );
}
