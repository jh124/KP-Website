const copyrightYear = document.querySelector(".site-footer [data-current-year]");
if (copyrightYear) copyrightYear.textContent = String(new Date().getFullYear());

function isPlainClick(event) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

const backLink = document.querySelector(".book-back-link");
if (backLink && document.referrer) {
  const previous = new URL(document.referrer);
  const catalogue = new URL(backLink.href);
  const fromBook = previous.pathname.startsWith(new URL("books/", catalogue).pathname);
  const fromCatalogue = previous.pathname === catalogue.pathname;
  if (previous.origin === catalogue.origin && previous.pathname !== location.pathname && (fromBook || fromCatalogue)) {
    if (fromBook) backLink.href = previous.href;
    backLink.addEventListener("click", (event) => {
      // Restore the reader's scroll position on an ordinary return. The link
      // itself also works in a new tab, after an in-page jump, or without JS.
      if (!isPlainClick(event) || history.length < 2 || location.hash) return;
      event.preventDefault();
      history.back();
    });
  }
}

// Keep the native mobile disclosure menu functional without JavaScript.
document.querySelectorAll(".mobile-menu").forEach((menu) => {
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => { menu.open = false; });
  });
  document.addEventListener("pointerdown", (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary").focus();
    }
  });
});

// Anchor navigation should not animate across a page whose Lulu widgets
// are still expanding. An animated jump can end at a stale position in Safari.
document.documentElement.style.scrollBehavior = "auto";

const anchors = new Map(
  ["books", "ebooks"]
    .map((id) => ["#" + id, document.getElementById(id)])
    .filter((entry) => entry[1])
);
const printBooks = document.getElementById("books");

if (anchors.size) {
  let resizeObserver;
  let expiryTimer;
  let animationFrame = 0;

  const selectedAnchor = () => anchors.get(window.location.hash);

  function alignSelectedAnchor() {
    animationFrame = 0;
    const target = selectedAnchor();
    if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function scheduleAlignment() {
    if (!animationFrame) animationFrame = requestAnimationFrame(alignSelectedAnchor);
  }

  function stopAlignment() {
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    clearTimeout(expiryTimer);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    window.removeEventListener("pointerdown", stopAlignment);
    window.removeEventListener("wheel", stopAlignment);
    window.removeEventListener("touchstart", stopAlignment);
    window.removeEventListener("keydown", stopAlignment);
  }

  function startAlignment() {
    stopAlignment();
    if (!selectedAnchor()) return;

    scheduleAlignment();

    // Lulu replaces and expands the entire print catalogue after page load,
    // shifting the Ebooks section. Follow those actual layout changes.
    if (window.location.hash === "#ebooks" && printBooks && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(scheduleAlignment);
      resizeObserver.observe(printBooks);
    }

    // Respect scrolling and other direct interaction as soon as it begins.
    window.addEventListener("pointerdown", stopAlignment, { passive: true });
    window.addEventListener("wheel", stopAlignment, { passive: true });
    window.addEventListener("touchstart", stopAlignment, { passive: true });
    window.addEventListener("keydown", stopAlignment);
    expiryTimer = setTimeout(stopAlignment, 20000);
  }

  document.addEventListener("click", (event) => {
    if (!isPlainClick(event)) return;
    const link = event.target.closest?.("a[href]");
    if (!link) return;

    const destination = new URL(link.href);
    if (destination.origin !== window.location.origin ||
        destination.pathname !== window.location.pathname ||
        !anchors.has(destination.hash)) return;

    // Handle same-page links ourselves so repeated clicks work and Safari
    // never runs a competing native smooth-scroll animation.
    event.preventDefault();
    if (window.location.hash !== destination.hash) {
      history.pushState(null, "", destination.hash);
    }
    startAlignment();
  });

  window.addEventListener("hashchange", startAlignment);
  window.addEventListener("popstate", startAlignment);
  window.addEventListener("pageshow", startAlignment);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startAlignment, { once: true });
  } else {
    startAlignment();
  }
}
