(() => {
  const key = 'winter-expedition-theme';
  let mode = 'day';
  try { if (['day', 'night'].includes(localStorage.getItem(key))) mode = localStorage.getItem(key); } catch {}
  function apply(value) {
    mode = value === 'day' ? 'day' : 'night';
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode === 'day' ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const label = mode === 'day' ? '夜间模式' : '日间模式';
      button.textContent = label;
      button.setAttribute('aria-label', '切换到' + label);
      button.setAttribute('aria-pressed', String(mode === 'day'));
    });
  }
  apply(mode);
  document.addEventListener('DOMContentLoaded', () => {
    apply(mode);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        apply(mode === 'day' ? 'night' : 'day');
        try { localStorage.setItem(key, mode); } catch {}
      });
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === key) apply(event.newValue);
  });
})();
