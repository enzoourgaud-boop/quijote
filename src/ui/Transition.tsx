/** Rideau joué à chaque changement de salle (désactivé si mouvement réduit). */
const PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 6) * 0.05,
  rot: (i * 47) % 360,
  size: 18 + ((i * 13) % 16),
}));

export function Transition() {
  return (
    <div class="transicion" aria-hidden="true">
      {PETALS.map((p, i) => (
        <span
          key={i}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, width: `${p.size}px`, height: `${p.size * 1.3}px`, '--rot': `${p.rot}deg` }}
        />
      ))}
    </div>
  );
}
