"use client";

import { useEffect } from "react";
import { subscribeConsent } from "@/lib/consent";

const TAWK_SRC = "https://embed.tawk.to/6aeb0264d394313c378e77c2/1k6j02mco";

type TawkWindow = Window & {
  Tawk_API?: Record<string, unknown>;
  Tawk_LoadStart?: Date;
  dataLayer?: unknown[];
};

let loaded = false;

/**
 * Події чату для GTM → GA4. GA4-тег у GTM сам дотримується Consent Mode
 * (analytics_storage), тож без згоди на аналітику дані в GA не підуть.
 */
function track(event: string, params: Record<string, unknown> = {}) {
  const w = window as TawkWindow;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, chat_provider: "tawk", ...params });
}

function loadTawk() {
  if (loaded) return;
  loaded = true;

  const w = window as TawkWindow;
  const api = (w.Tawk_API = w.Tawk_API || {});
  w.Tawk_LoadStart = new Date();

  // Колбеки треба задати до завантаження скрипта.
  let visitorMessaged = false;
  Object.assign(api, {
    onChatMaximized: () => track("tawk_chat_open"),
    onChatStarted: () => track("tawk_chat_started"),
    onChatMessageVisitor: () => {
      // Лише перше повідомлення за сторінку, щоб не спамити подіями.
      if (visitorMessaged) return;
      visitorMessaged = true;
      track("tawk_chat_message");
    },
    onPrechatSubmit: () => track("tawk_prechat_submit"),
    onOfflineSubmit: () => track("tawk_offline_submit"),
    onChatEnded: () => track("tawk_chat_ended"),
  });

  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = TAWK_SRC;
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  document.body.appendChild(s1);
}

/**
 * Онлайн-чат Tawk.to. Вантажиться лише після згоди на категорію «functional»
 * (на UA-домені згода видається автоматично). Відкликання згоди перезавантажує
 * сторінку (autoClear у cookie-consent.tsx), тож чат зникає.
 */
export default function TawkChat() {
  useEffect(
    () =>
      subscribeConsent((consent) => {
        if (consent.functional) loadTawk();
      }),
    [],
  );

  return null;
}
