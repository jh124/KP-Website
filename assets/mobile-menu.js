// Enhance the native disclosure menu; it remains usable without JavaScript.
document.querySelectorAll('.mobile-menu').forEach((menu) => {
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => { menu.open = false; });
  });
  document.addEventListener('pointerdown', (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
});
