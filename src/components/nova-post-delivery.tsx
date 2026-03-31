"use client";
import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeliveryMethod = "warehouse" | "nova_dept" | "nova_courier" | "";
export type PaymentMethod = "online_card" | "cash_on_delivery" | "bank_transfer" | "installment" | "";

export interface NpCity {
  ref: string;
  name: string;
  settlementType: string;
}

export interface NovaPostDeliveryState {
  method: DeliveryMethod;
  payment: PaymentMethod;
  city: NpCity | null;
  warehouseRef: string;
  warehouseDesc: string;
  street: string;
  building: string;
  flat: string;
  isValid: boolean;
}

interface NpWarehouse {
  ref: string;
  number: string;
  description: string;
  shortAddress: string;
  postMachineType: string;
}

interface InputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

interface CardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon: React.ReactNode;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const DELIVERY_OPTIONS: CardOption<DeliveryMethod>[] = [
  {
    value: "warehouse",
    label: "Самовивіз",
    description: "З нашого складу",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    value: "nova_dept",
    label: "Відділення",
    description: "Нової Пошти",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    value: "nova_courier",
    label: "Кур'єр",
    description: "Нова Пошта",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
];

const ONLINE_CARD_OPTION: CardOption<PaymentMethod> = {
  value: "online_card",
  label: "Картою онлайн",
  description: "Visa / Mastercard",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
};

const BANK_TRANSFER_OPTION: CardOption<PaymentMethod> = {
  value: "bank_transfer",
  label: "Банківський переказ",
  description: "Рахунок-фактура",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
};

const CASH_ON_DELIVERY_OPTION: CardOption<PaymentMethod> = {
  value: "cash_on_delivery",
  label: "Накладений платіж",
  description: "Оплата при отриманні",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

const INSTALLMENT_OPTION: CardOption<PaymentMethod> = {
  value: "installment",
  label: "Оплата частинами",
  description: "ПриватБанк · Monobank",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M7 15h2M12 15h2" />
    </svg>
  ),
};

const PAYMENT_OPTIONS: Record<DeliveryMethod, CardOption<PaymentMethod>[]> = {
  warehouse: [ONLINE_CARD_OPTION, INSTALLMENT_OPTION, BANK_TRANSFER_OPTION],
  nova_dept: [ONLINE_CARD_OPTION, INSTALLMENT_OPTION, BANK_TRANSFER_OPTION, CASH_ON_DELIVERY_OPTION],
  nova_courier: [ONLINE_CARD_OPTION, INSTALLMENT_OPTION, BANK_TRANSFER_OPTION, CASH_ON_DELIVERY_OPTION],
  "": [],
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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
        Місто
      </label>
      <input
        type="text"
        placeholder="Почніть вводити назву міста..."
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
          Пошук…
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
        Відділення / Поштомат
      </label>
      <input
        type="text"
        placeholder="Пошук за номером або адресою…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange("", "");
        }}
        className="w-full px-4 py-3 text-sm bg-gray-50 border-2 border-gray-200 rounded-lg outline-none focus:border-red-400 mb-2 box-border"
      />
      {loading && <p className="text-xs text-gray-400 mb-2 animate-pulse">Завантаження…</p>}
      {!loading && cityRef && warehouses.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">Нічого не знайдено</p>
      )}
      {!cityRef && <p className="text-xs text-gray-400 mb-2">Спочатку оберіть місто</p>}
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
            <option value="" disabled>Оберіть відділення…</option>
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
        <span className="text-sm font-semibold text-gray-700">Спосіб доставки</span>
      </div>

      <CardSelector<DeliveryMethod>
        label=""
        options={DELIVERY_OPTIONS}
        value={method}
        onChange={handleMethodChange}
      />

      {/* Delivery details */}
      {method === "nova_dept" && (
        <div className="p-4 sm:p-5 bg-red-50 rounded-xl border-2 border-red-100 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Нова Пошта · Відділення / Поштомат
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
            Нова Пошта · Кур'єр
          </div>
          <CityAutocomplete value={city} onSelect={setCity} />
          <Input label="Вулиця" placeholder="напр. вул. Шевченка" value={street} onChange={setStreet} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Будинок" placeholder="напр. 42Б" value={building} onChange={setBuilding} />
            <Input label="Квартира / офіс" placeholder="напр. 15" value={flat} onChange={setFlat} />
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
            <p className="m-0 mb-1 text-sm font-semibold text-red-700">Самовивіз зі складу</p>
            <p className="m-0 text-sm text-red-500 leading-snug">
              м. Київ, вул. Складська, 14. Пн–Пт 09:00–18:00, Сб 10:00–15:00.
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
            <span className="text-sm font-semibold text-gray-700">Спосіб оплати</span>
          </div>
          <CardSelector<PaymentMethod>
            label=""
            options={PAYMENT_OPTIONS[method]}
            value={payment}
            onChange={setPayment}
          />
        </>
      )}
    </div>
  );
}
