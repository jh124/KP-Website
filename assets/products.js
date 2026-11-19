export function isLordsDay(date = new Date()) {
  return date.getDay() === 0;
}

if (typeof document !== "undefined") {
  let timer;
  function loadLuluButtons() {
    if (!document.querySelector("lulu-buy-button") || document.querySelector("script[data-lulu-cart]")) return;
    const script = document.createElement("script");
    script.src = "https://js.lulu.com/lulu-buy.js";
    script.defer = true;
    script.setAttribute("data-lulu-cart", "true");
    document.head.append(script);
  }

  function updatePurchasing() {
    const now = new Date();
    const closed = isLordsDay(now);
    for (const section of document.querySelectorAll("[data-print-purchase]")) {
      section.querySelector("[data-purchase-controls]").hidden = closed;
      section.querySelector("[data-lords-day-message]").hidden = !closed;
    }
    if (!closed) loadLuluButtons();
    clearTimeout(timer);
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    timer = setTimeout(updatePurchasing, midnight.getTime() - now.getTime());
  }

  if (document.querySelector("[data-print-purchase]")) {
    updatePurchasing();
    window.addEventListener("pageshow", updatePurchasing);
    window.addEventListener("focus", updatePurchasing);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) updatePurchasing();
    });
  }
}
