'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Cuboid, Truck, CreditCard, Landmark, Warehouse, Package } from 'lucide-react';
import { useDomainConfig } from '@/hooks/useDomain';
import InPostDetails, { type InPostDetailsState } from '@/components/inpost-delivery';
import DpdDetails, { type DpdDetailsState } from '@/components/dpd-delivery';
import type {
  PolandDeliveryMethod,
  PolandPaymentMethod,
  PolandDeliveryState,
  CardOption,
} from '@/types/delivery-poland';

export type { PolandDeliveryMethod, PolandPaymentMethod, PolandDeliveryState };

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function CardSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: CardOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-5">
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
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/40'
              }`}
            >
              <span className={`flex-shrink-0 ${selected ? 'text-yellow-500' : 'text-gray-400'}`}>
                {opt.icon}
              </span>
              <span className="flex flex-col flex-1">
                <span className="text-sm font-semibold leading-tight">{opt.label}</span>
                {opt.description && (
                  <span className={`text-xs leading-tight ${selected ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {opt.description}
                  </span>
                )}
              </span>
              {selected && (
                <span className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DeliveryPoland({
  onChange,
}: {
  onChange?: (state: PolandDeliveryState) => void;
}) {
  const t = useTranslations('deliveryPoland');
  const domainConfig = useDomainConfig();

  const [method, setMethod] = useState<PolandDeliveryMethod>('');
  const [payment, setPayment] = useState<PolandPaymentMethod>('');
  const [inpostDetails, setInpostDetails] = useState<InPostDetailsState | null>(null);
  const [dpdDetails, setDpdDetails] = useState<DpdDetailsState | null>(null);

  const buildState = (
    m: PolandDeliveryMethod,
    pmt: PolandPaymentMethod,
    details: InPostDetailsState | null,
    dpd: DpdDetailsState | null,
  ): PolandDeliveryState => {
    const deliveryFilled =
      (m === 'pickup') ||
      ((m === 'parcel_locker_inpost' || m === 'courier_inpost') && (details?.isFilled ?? false)) ||
      (m === 'dpd_parcel' && (dpd?.isFilled ?? false));
    return {
      method: m,
      payment: pmt,
      selectedPoint: details?.selectedPoint ?? null,
      dpdPointId: dpd?.pointId ?? null,
      street: details?.street ?? '',
      building: details?.building ?? '',
      flat: details?.flat ?? '',
      city: details?.city ?? '',
      postalCode: details?.postalCode ?? '',
      isValid: deliveryFilled && !!pmt,
    };
  };

  const deliveryOptions: CardOption<PolandDeliveryMethod>[] = [
    {
      value: 'parcel_locker_inpost',
      label: t('option.parcelLocker.label'),
      description: t('option.parcelLocker.description'),
      icon: (
        <Cuboid/>
      ),
    },
    {
      value: 'courier_inpost',
      label: t('option.courier.label'),
      description: t('option.courier.description'),
      icon: (
        <Truck/>
      ),
    },
    {
      value: 'pickup',
      label: t('option.pickup.label'),
      description: t('option.pickup.description'),
      icon: (
        <Warehouse/>
      ),
    },
    {
      value: 'dpd_parcel',
      label: t('option.dpdParcel.label'),
      description: t('option.dpdParcel.description'),
      icon: (
        <Package/>
      ),
    },
  ];

  const paymentOptions: CardOption<PolandPaymentMethod>[] = [
    {
      value: 'przelewy24',
      label: t('payment.przelewy24.label'),
      description: t('payment.przelewy24.description'),
      icon: (
        <CreditCard/>
      ),
    },
    {
      value: 'bank_transfer',
      label: t('payment.bankTransfer.label'),
      description: t('payment.bankTransfer.description'),
      icon: (
        <Landmark/>
      ),
    },
  ];

  const isInpostMethod = method === 'parcel_locker_inpost' || method === 'courier_inpost';
  const deliveryFilled =
    method === 'pickup' ||
    (isInpostMethod && (inpostDetails?.isFilled ?? false)) ||
    (method === 'dpd_parcel' && (dpdDetails?.isFilled ?? false));

  const handleMethodChange = (val: PolandDeliveryMethod) => {
    setMethod(val);
    setInpostDetails(null);
    setDpdDetails(null);
    setPayment('');
    onChange?.(buildState(val, '', null, null));
  };

  const handleInpostChange = (details: InPostDetailsState) => {
    setInpostDetails(details);
    onChange?.(buildState(method, payment, details, dpdDetails));
  };

  const handleDpdChange = (details: DpdDetailsState) => {
    setDpdDetails(details);
    onChange?.(buildState(method, payment, inpostDetails, details));
  };

  const handlePaymentChange = (pmt: PolandPaymentMethod) => {
    setPayment(pmt);
    onChange?.(buildState(method, pmt, inpostDetails, dpdDetails));
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200">

      {/* Step 1 - Delivery method */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-5 h-5 rounded-full bg-yellow-400 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
          1
        </span>
        <span className="text-sm font-semibold text-gray-700">{t('deliveryMethod')}</span>
      </div>

      <CardSelector<PolandDeliveryMethod>
        options={deliveryOptions}
        value={method}
        onChange={handleMethodChange}
      />

      {/* InPost details (parcel locker map or courier address) */}
      {isInpostMethod && (
        <div className="p-4 sm:p-5 bg-yellow-50 rounded-xl border-2 border-yellow-100 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            {method === 'parcel_locker_inpost' ? 'InPost PaczkomatÂ®' : 'InPost Kurier'}
          </div>
          <InPostDetails
            method={method as 'parcel_locker_inpost' | 'courier_inpost'}
            onChange={handleInpostChange}
          />
        </div>
      )}

      {/* DPD Pudofinder */}
      {method === 'dpd_parcel' && (
        <div className="p-4 sm:p-5 bg-orange-50 rounded-xl border-2 border-orange-100 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            DPD Pickup
          </div>
          <DpdDetails onChange={handleDpdChange} />
        </div>
      )}

      {/* Warehouse pickup - show address */}
      {method === 'pickup' && (
        <div className="p-4 sm:p-5 bg-yellow-50 rounded-xl border-2 border-yellow-100 mb-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            {t('option.pickup.label')}
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            {domainConfig.contacts.address.map((line, i) => (
              <p key={i} className="font-medium">{line}</p>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">{t('option.pickup.note')}</p>
        </div>
      )}

      {/* Step 2 - Payment (shown once delivery is filled) */}
      {deliveryFilled && (
        <>
          <div className="h-px bg-gradient-to-r from-gray-200 to-transparent mb-5" />
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-yellow-400 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              2
            </span>
            <span className="text-sm font-semibold text-gray-700">{t('paymentMethod')}</span>
          </div>
          <CardSelector<PolandPaymentMethod>
            options={paymentOptions}
            value={payment}
            onChange={handlePaymentChange}
          />
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            <svg className="inline-block mr-1 mb-0.5 flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            {t('deliveryCostNote')}
          </p>
        </>
      )}
    </div>
  );
}
