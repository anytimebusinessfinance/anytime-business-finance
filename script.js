(() => {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.menu-toggle');
  if (!nav || !toggle) return;
  const compact = window.matchMedia('(max-width: 1100px)');
  nav.id = 'primary-navigation';
  nav.setAttribute('aria-label', 'Main navigation');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');

  function closeDropdowns() {
    nav.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.classList.remove('expanded');
      dropdown.querySelector('.submenu-toggle')?.setAttribute('aria-expanded', 'false');
    });
  }
  function setMenu(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.textContent = open ? '×' : '☰';
    if (!open) closeDropdowns();
  }
  nav.querySelectorAll('.dropdown').forEach((dropdown, index) => {
    const link = dropdown.querySelector('a');
    const menu = dropdown.querySelector('.dropdown-menu');
    if (!link || !menu) return;
    menu.id = `navigation-submenu-${index}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'submenu-toggle';
    button.setAttribute('aria-label', `Show ${link.textContent.trim()} links`);
    button.setAttribute('aria-controls', menu.id);
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span aria-hidden="true"></span>';
    link.after(button);
    button.addEventListener('click', () => {
      const open = !dropdown.classList.contains('expanded');
      closeDropdowns();
      dropdown.classList.toggle('expanded', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const dropdown = nav.querySelector('.dropdown.expanded');
    if (dropdown) {
      const button = dropdown.querySelector('.submenu-toggle');
      closeDropdowns();
      button?.focus();
    } else if (nav.classList.contains('open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
  });
  compact.addEventListener('change', () => setMenu(false));
})();
