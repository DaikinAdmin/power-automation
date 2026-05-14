'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';

// ---------------------------------------------------------------------------
// Public state type
// ---------------------------------------------------------------------------

export interface DpdDetailsState {
  pointId: string | null;
  isFilled: boolean;
}

// ---------------------------------------------------------------------------
// DPD Pudofinder widget key (public, non-secret)
// ---------------------------------------------------------------------------

const DPD_WIDGET_KEY = '947be863846b3ab5b07421b77e8159b6';
const DPD_SCRIPT_SRC = `https://pudofinder.dpd.com.pl/source/dpd_widget.js?key=${DPD_WIDGET_KEY}`;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function DpdDetails({
  onChange,
}: {
  onChange: (state: DpdDetailsState) => void;
}) {
  const t = useTranslations('deliveryPoland');
  const [pointId, setPointId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointSelected = useCallback(
    (id: string) => {
      setPointId(id);
      onChange({ pointId: id, isFilled: true });
    },
    [onChange],
  );

  // Keep global callback in sync
  useEffect(() => {
    (window as any).pointSelected = handlePointSelected;
  }, [handlePointSelected]);

  useEffect(() => {
    if (!containerRef.current) return;

    // The DPD widget locates itself via document.getElementById('dpd-widget')
    // and renders into that element's parentNode. We insert both scripts
    // into our container so the widget renders exactly here.

    // 1. Inline script with id="dpd-widget" that defines the callback
    const inlineScript = document.createElement('script');
    inlineScript.id = 'dpd-widget';
    inlineScript.type = 'text/javascript';
    inlineScript.text = `function pointSelected(p){ window.pointSelected && window.pointSelected(p); }`;
    containerRef.current.appendChild(inlineScript);

    // 2. Widget loader script
    const widgetScript = document.createElement('script');
    widgetScript.type = 'text/javascript';
    widgetScript.src = DPD_SCRIPT_SRC;
    containerRef.current.appendChild(widgetScript);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      (window as any).pointSelected = undefined;
    };
  // run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    setPointId(null);
    onChange({ pointId: null, isFilled: false });
  };

  return (
    <div className="mt-4">
      {/* Container where both script tags are injected — the widget renders here */}
      <div ref={containerRef} className="w-full" />

      {pointId ? (
        <div className="mt-3 bg-white p-4 rounded-lg shadow-sm border border-orange-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wide">{t('selected')}:</span>
            <p className="text-gray-900 mt-1 text-sm font-semibold">{pointId}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-orange-600 text-sm font-medium underline ml-4 flex-shrink-0"
          >
            {t('change')}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500 text-center leading-relaxed">
          {t('option.dpdParcel.hint')}
        </p>
      )}
    </div>
  );
}
