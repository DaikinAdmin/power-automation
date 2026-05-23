'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

const INPOST_POINT_EVENT = 'inpost-point-selected';

interface Point {
  name: string;
  address_details: {
    city: string;
    street: string;
    building_number: string;
  };
}

const DELIVERY_METHODS = [
  { id: 'parcel_locker', name: 'InPost Paczkomat 24/7', basePrice: 16.99 },
  { id: 'courier', name: 'InPost Кур’єр', basePrice: 19.99 },
];

export default function DeliverySelectionPage() {
  const [method, setMethod] = useState(DELIVERY_METHODS[0]);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Реф для доступу до DOM-елемента віджета
  const widgetRef = useRef<HTMLElement>(null);

  // "Complete integration" — widget dispatches a custom event on document
  useEffect(() => {
    const handlePointSelected = (event: Event) => {
      const point = (event as CustomEvent<Point>).detail;
      setSelectedPoint(point);
      setShowMapModal(false);
    };

    document.addEventListener(INPOST_POINT_EVENT, handlePointSelected);
    return () => document.removeEventListener(INPOST_POINT_EVENT, handlePointSelected);
  }, []);

  // 3. Використання API віджета (центрування на Вроцлаві)
  // onpoint and token must be set via setAttribute — the widget defines them as getter-only properties
  useEffect(() => {
    const widgetElement = widgetRef.current;

    if (widgetElement && showMapModal) {
      widgetElement.setAttribute('onpoint', INPOST_POINT_EVENT);
      widgetElement.setAttribute('language', 'uk');
      widgetElement.setAttribute('config', 'parcelCollect');
      if (process.env.NEXT_PUBLIC_INPOST_WIDGET_TOKEN) {
        widgetElement.setAttribute('token', process.env.NEXT_PUBLIC_INPOST_WIDGET_TOKEN);
      }

      const handleWidgetInit = (event: any) => {
        const api = event.detail.api;
        api.changePosition({ longitude: 17.0385, latitude: 51.1078 }, 12);
      };

      widgetElement.addEventListener('inpost.geowidget.init', handleWidgetInit);

      return () => {
        widgetElement.removeEventListener('inpost.geowidget.init', handleWidgetInit);
      };
    }
  }, [showMapModal]);

  return (
    <>
      <link rel="stylesheet" href="https://geowidget.inpost.pl/inpost-geowidget.css" />
      {/* defer згідно з докою */}
      <Script src="https://geowidget.inpost.pl/inpost-geowidget.js" strategy="lazyOnload" />

      <div className="max-w-2xl mx-auto p-6 bg-white shadow-xl border border-gray-100 rounded-2xl mt-10">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">Доставка</h1>

        {/* Вибір методу */}
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DELIVERY_METHODS.map((m) => (
              <div
                key={m.id}
                onClick={() => setMethod(m)}
                className={`cursor-pointer p-5 border-2 rounded-xl transition-all ${
                  method.id === m.id ? 'border-yellow-400 bg-yellow-50/50' : 'border-gray-100'
                }`}
              >
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-gray-600">{m.basePrice.toFixed(2)} PLN</p>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка виклику віджета */}
        {method.id === 'parcel_locker' && (
          <div className="mb-8 p-6 bg-gray-50 rounded-xl text-center">
            {!selectedPoint ? (
              <button
                onClick={() => setShowMapModal(true)}
                className="bg-gray-800 hover:bg-black text-white font-medium py-3 px-6 rounded-lg"
              >
                📍 Відкрити карту поштоматів
              </button>
            ) : (
              <div className="text-left bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-400 uppercase font-bold">Обрано: {selectedPoint.name}</span>
                  <p className="text-gray-900 mt-1">
                    {selectedPoint.address_details.city}, {selectedPoint.address_details.street} {selectedPoint.address_details.building_number}
                  </p>
                </div>
                <button onClick={() => setShowMapModal(true)} className="text-yellow-600 text-sm font-medium underline">
                  Змінити
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальне вікно з InPost Geowidget */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Оберіть поштомат InPost</h3>
              <button onClick={() => setShowMapModal(false)} className="text-gray-500 text-2xl p-2">&times;</button>
            </div>
            
            <div className="flex-1 w-full bg-gray-100">
              {/* Оновлені параметри згідно з документацією */}
              <inpost-geowidget
                ref={widgetRef}
              ></inpost-geowidget>
            </div>
          </div>
        </div>
      )}
    </>
  );
}