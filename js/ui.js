document.querySelectorAll('input[name="control-mode"]').forEach(r => {
  r.addEventListener('change', () => {
    const desc = document.getElementById('mode-desc');
    const labels = document.querySelectorAll('#mode-selector label');
    labels.forEach(l => l.style.background = 'transparent');
    r.closest('label').style.background = 'rgba(255,255,255,0.15)';
    desc.textContent = r.value === 'fingers'
      ? 'Show 1-5 fingers to position paddle in zones'
      : 'Move hand up/down to control paddle';
  });
});
