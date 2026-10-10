// Logo de la tienda: una flor de cinco petalos, crema sobre un cuadrado verde. El mismo dibujo que src/app/icon.svg.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <g className="fill-primary-foreground">
        <circle cx="16" cy="9.5" r="4.6" />
        <circle cx="22.18" cy="13.99" r="4.6" />
        <circle cx="19.82" cy="21.26" r="4.6" />
        <circle cx="12.18" cy="21.26" r="4.6" />
        <circle cx="9.82" cy="13.99" r="4.6" />
      </g>
      <circle cx="16" cy="16" r="3.2" className="fill-primary" />
    </svg>
  );
}
