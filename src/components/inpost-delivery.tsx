'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useTranslations } from 'next-intl';
import type { InPostPoint, CardOption } from '@/types/delivery-poland';

export type { InPostPoint };

// ---------------------------------------------------------------------------
// Public state type
// ---------------------------------------------------------------------------

export interface InPostDetailsState {
  selectedPoint: InPostPoint | null;
  street: string;
  building: string;
  flat: string;
  city: string;
  postalCode: string;
  isFilled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPOST_POINT_EVENT = 'inpost-point-selected';

const IS_SANDBOX = process.env.NEXT_PUBLIC_INPOST_ENV === 'sandbox';
const GEOWIDGET_BASE_URL = IS_SANDBOX
  ? 'https://sandbox-easy-geowidget-sdk.easypack24.net'
  : 'https://geowidget.inpost.pl';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function Input({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-lg outline-none transition focus:border-yellow-400 box-border"
      />
    </div>
  );
}

function GeowidgetModal({
  onClose,
  onPointSelected,
}: {
  onClose: () => void;
  onPointSelected: (point: InPostPoint) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const widget = document.createElement('inpost-geowidget');
    widget.setAttribute('token', process.env.NEXT_PUBLIC_INPOST_WIDGET_TOKEN ?? '');
    widget.setAttribute('language', 'pl');
    widget.setAttribute('config', 'parcelCollect');
    widget.setAttribute('onpoint', INPOST_POINT_EVENT);
    widget.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(widget);
    return () => {
      if (container.contains(widget)) container.removeChild(widget);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const point = (event as CustomEvent<InPostPoint>).detail;
      onPointSelected(point);
      onClose();
    };
    document.addEventListener(INPOST_POINT_EVENT, handler);
    return () => document.removeEventListener(INPOST_POINT_EVENT, handler);
  }, [onClose, onPointSelected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg">Wybierz paczkomat InPost</h3>
          <button type="button" onClick={onClose} className="text-gray-500 text-2xl p-2 leading-none">&times;</button>
        </div>
        <div className="flex-1 w-full bg-gray-100">
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export â€” renders details for the given InPost method
// ---------------------------------------------------------------------------

export default function InPostDetails({
  method,
  onChange,
}: {
  method: 'parcel_locker_inpost' | 'courier_inpost';
  onChange: (state: InPostDetailsState) => void;
}) {
  const t = useTranslations('deliveryPoland');

  const [selectedPoint, setSelectedPoint] = useState<InPostPoint | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [flat, setFlat] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Reset state when method changes
  useEffect(() => {
    setSelectedPoint(null);
    setStreet('');
    setBuilding('');
    setFlat('');
    setCity('');
    setPostalCode('');
  }, [method]);

  const buildState = (
    pt: InPostPoint | null,
    s: string, b: string, f: string, c: string, pc: string,
  ): InPostDetailsState => {
    const isFilled =
      (method === 'parcel_locker_inpost' && pt !== null) ||
      (method === 'courier_inpost' && !!s.trim() && !!c.trim());
    return { selectedPoint: pt, street: s, building: b, flat: f, city: c, postalCode: pc, isFilled };
  };

  const handlePointSelected = (pt: InPostPoint) => {
    setSelectedPoint(pt);
    onChange(buildState(pt, street, building, flat, city, postalCode));
  };
  const handleStreet = (v: string) => { setStreet(v); onChange(buildState(selectedPoint, v, building, flat, city, postalCode)); };
  const handleBuilding = (v: string) => { setBuilding(v); onChange(buildState(selectedPoint, street, v, flat, city, postalCode)); };
  const handleFlat = (v: string) => { setFlat(v); onChange(buildState(selectedPoint, street, building, v, city, postalCode)); };
  const handleCity = (v: string) => { setCity(v); onChange(buildState(selectedPoint, street, building, flat, v, postalCode)); };
  const handlePostalCode = (v: string) => { setPostalCode(v); onChange(buildState(selectedPoint, street, building, flat, city, v)); };

  return (
    <>
      <link rel="stylesheet" href={`${GEOWIDGET_BASE_URL}/inpost-geowidget.css`} />
      <Script src={`${GEOWIDGET_BASE_URL}/inpost-geowidget.js`} strategy="afterInteractive" />

      {method === 'parcel_locker_inpost' && (
        <div className="mt-4">
          {!selectedPoint ? (
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              className="w-full bg-gray-800 hover:bg-black text-white font-medium py-3 px-6 rounded-lg text-sm"
            >
              {t('openMap')}
            </button>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-400 uppercase font-bold">{t('selected')}: {selectedPoint.name}</span>
                <p className="text-gray-900 mt-1 text-sm">
                  {selectedPoint.address_details.city}, {selectedPoint.address_details.street} {selectedPoint.address_details.building_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="text-yellow-600 text-sm font-medium underline ml-4 flex-shrink-0"
              >
                {t('change')}
              </button>
            </div>
          )}
          {showMapModal && (
            <GeowidgetModal
              onClose={() => setShowMapModal(false)}
              onPointSelected={handlePointSelected}
            />
          )}
        </div>
      )}

      {method === 'courier_inpost' && (
        <div className="mt-4">
          <Input label={t('city')} placeholder={t('cityPlaceholder')} value={city} onChange={handleCity} />
          <Input label={t('postalCode')} placeholder="00-000" value={postalCode} onChange={handlePostalCode} />
          <Input label={t('street')} placeholder={t('streetPlaceholder')} value={street} onChange={handleStreet} />
          <div className="flex gap-3">
            <div className="flex-1">
              <Input label={t('building')} placeholder={t('buildingPlaceholder')} value={building} onChange={handleBuilding} />
            </div>
            <div className="w-28">
              <Input label={t('flat')} placeholder={t('flatPlaceholder')} value={flat} onChange={handleFlat} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
