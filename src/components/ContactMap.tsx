'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './ContactMap.module.css';
import { useTranslations } from 'next-intl';

// Динамічне завантаження карти без SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function ContactMap() {
  const t = useTranslations("contactMap");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Виправлення іконок Leaflet
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[400px] w-full bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  const latitude = 51.0740915;
  const longitude = 16.9552386;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const geoUrl = `geo:${latitude},${longitude}`;

  const handleOpenMaps = () => {
    // На мобільних пристроях спробувати geo: протокол
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = geoUrl;
      // Fallback на Google Maps якщо geo: не спрацює
      setTimeout(() => {
        window.open(googleMapsUrl, '_blank');
      }, 500);
    } else {
      // На десктопі відкрити Google Maps
      window.open(googleMapsUrl, '_blank');
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t("ourLocation")}</h2>
        <button
          onClick={handleOpenMaps}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {t("openMaps")}
        </button>
      </div>
      <div className={`rounded-lg overflow-hidden shadow-md ${styles.mapWrapper}`}>
        {/* @ts-ignore */}
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          style={{ height: '400px', width: '100%', zIndex: 0 }}
          scrollWheelZoom={false}
        >
          {/* @ts-ignore */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {/* @ts-ignore */}
          <Marker position={[latitude, longitude]}>
            <Popup>
              Power Automation<br />Wrocław, Poland <br/> Tyniecka 2, 52-407
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
