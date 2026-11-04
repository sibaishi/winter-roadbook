(() => {
  const button = document.querySelector('.nav-menu-toggle');
  const links = document.querySelector('.nav-links');
  if (!button || !links) return;
  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  }
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-nav')) setOpen(false);
  });
  window.matchMedia('(max-width:1000px)').addEventListener('change', () => setOpen(false));
})();
