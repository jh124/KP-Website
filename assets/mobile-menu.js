// Keep the native mobile disclosure menu usable without JavaScript.
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

// Lulu's product widgets load after the initial page render. They can expand
// the Print books section and push #ebooks away from the position that the
// browser originally scrolled to.
const ebooks = document.getElementById("ebooks");
const printBooks = document.getElementById("books");

if (ebooks && printBooks) {
  let resizeObserver;
  let expiryTimer;
  let pendingFrame = 0;

  function alignEbooks() {
    pendingFrame = 0;
    if (window.location.hash !== "#ebooks") return;
    // "instant" avoids an extended smooth-scroll animation fighting reflows.
    ebooks.scrollIntoView({ block: "start", behavior: "instant" });
  }

  function scheduleAlignment() {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(alignEbooks);
  }

  function stopAlignment() {
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    clearTimeout(expiryTimer);
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    window.removeEventListener("pointerdown", stopAlignment);
    window.removeEventListener("wheel", stopAlignment);
    window.removeEventListener("keydown", stopAlignment);
  }

  function startAlignment() {
    stopAlignment();
    if (window.location.hash !== "#ebooks") return;

    scheduleAlignment();
    // Correct the position whenever asynchronous catalogue/widget rendering
    // changes the height of the section immediately preceding Ebooks.
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(scheduleAlignment);
      resizeObserver.observe(printBooks);
    }

    // Never fight intentional scrolling, and don't keep correcting forever.
    window.addEventListener("pointerdown", stopAlignment, { passive: true });
    window.addEventListener("wheel", stopAlignment, { passive: true });
    window.addEventListener("keydown", stopAlignment);
    expiryTimer = setTimeout(stopAlignment, 20000);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const destination = new URL(link.href);
    if (destination.hash === "#ebooks" &&
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname) {
      // Even repeated taps on an unchanged #ebooks hash should realign.
      setTimeout(startAlignment, 0);
    }
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#ebooks") startAlignment();
    else stopAlignment();
  });
  window.addEventListener("pageshow", () => {
    if (window.location.hash === "#ebooks") startAlignment();
  });
}
