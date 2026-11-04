(() => {
  const inputs = [...document.querySelectorAll('[data-shopping]')];
  function update() {
    const count = inputs.filter(input => input.checked).length;
    document.querySelector('#shoppingCount').textContent = count + ' / ' + inputs.length + ' 项已备齐';
    document.querySelector('#shoppingProgress').max = inputs.length;
    document.querySelector('#shoppingProgress').value = count;
  }
  inputs.forEach(input => {
    const key = 'winter-shopping-' + input.dataset.shopping;
    try { input.checked = localStorage.getItem(key) === '1'; } catch {}
    input.addEventListener('change', () => {
      try { localStorage.setItem(key, input.checked ? '1' : '0'); } catch {}
      update();
    });
  });
  update();
})();
