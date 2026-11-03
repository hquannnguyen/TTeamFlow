const COLORS = ['#0A4FE0', '#0AA3F0', '#5B46F5', '#00C9B8', '#F59E0B', '#EC4899'];

/** Bắn pháo hoa giấy từ một điểm (mặc định: giữa màn hình, phía trên). Tự dọn sau khi xong. */
export function fireConfetti(origin?: { x: number; y: number }, count = 70) {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const x0 = origin?.x ?? window.innerWidth / 2;
  const y0 = origin?.y ?? window.innerHeight * 0.35;

  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const power = 90 + Math.random() * 260;
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power - 120;
    const size = 6 + Math.random() * 7;
    piece.style.cssText =
      `left:${x0}px;top:${y0}px;width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;` +
      `background:${COLORS[i % COLORS.length]};border-radius:${Math.random() > 0.6 ? '50%' : '2px'};` +
      `--dx:${dx}px;--dy:${dy}px;--rot:${Math.random() * 900 - 450}deg;` +
      `animation-duration:${1100 + Math.random() * 900}ms;`;
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 2300);
}
