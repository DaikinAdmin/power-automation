"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function BinotelScripts() {
  const pathname = usePathname();

  // Список шляхів, де скрипти НЕ повинні відображатися
  const excludedPaths = ["/checkout", "/admin", "/cart"];
  
  // Перевірка, чи поточний шлях є у списку виключень
  const isExcluded = excludedPaths.some((path) => pathname.includes(path));

  if (isExcluded) return null;

  return (
    <>
      {/* Віджет зворотного дзвінка */}
      <Script
        id="binotel-getcall"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(d, w, s) {
            var widgetHash = '4dwo56b2g413yzwxtkuk',
            gcw = d.createElement(s);
            gcw.type = 'text/javascript';
            gcw.async = true;
            gcw.src = '//widgets.binotel.com/getcall/widgets/' + widgetHash + '.js';
            var sn = d.getElementsByTagName(s)[0];
            sn.parentNode.insertBefore(gcw, sn);
          })(document, window, 'script');`,
        }}
      />
      {/* Віджет чату */}
      <Script
        id="binotel-chat"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(d, w, s) {
            var widgetHash = 'GcDTf4yHGBF3OHLyulIi',
            bch = d.createElement(s);
            bch.type = 'text/javascript';
            bch.async = true;
            bch.src = '//widgets.binotel.com/chat/widgets/' + widgetHash + '.js';
            var sn = d.getElementsByTagName(s)[0];
            sn.parentNode.insertBefore(bch, sn);
          })(document, window, 'script');`,
        }}
      />
    </>
  );
}