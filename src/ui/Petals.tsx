/** Pages de livre qui volent doucement (décor). Coupées si les animations sont réduites. */
import { useEffect, useRef } from 'preact/hooks';
import { motionReduced } from '../prefs';

interface P { x: number; y: number; r: number; vy: number; vx: number; a: number; va: number; hue: number }

export function Petals({ burst = false }: { burst?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || motionReduced()) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now();
    const resize = () => {
      w = cv.width = window.innerWidth;
      h = cv.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const n = burst ? 46 : Math.min(22, Math.round(w / 60));
    const mk = (top: boolean): P => ({
      x: Math.random() * w, y: top ? -20 - Math.random() * h * (burst ? 0.4 : 1) : Math.random() * h,
      r: 5 + Math.random() * 7, vy: 18 + Math.random() * 30, vx: -8 + Math.random() * 16, a: Math.random() * 6, va: -1 + Math.random() * 2,
      hue: 28 + Math.random() * 14,
    });
    const ps = Array.from({ length: n }, () => mk(burst));
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(now / 900 + p.r) * 10) * dt;
        p.a += p.va * dt;
        if (p.y > h + 20) Object.assign(p, mk(true), { y: -20 });
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 55%, .75)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [burst]);
  return <canvas ref={ref} class="petalos" aria-hidden="true" />;
}
