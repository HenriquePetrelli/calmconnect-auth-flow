import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * Boia do SOS (faixas laranja e branca + cordas), a mesma do botão da barra do
 * paciente. É o ícone do SOS em todo o app, no lugar do LifeBuoy do lucide.
 * Aceita as mesmas props de um ícone do lucide para servir onde ele é esperado
 * (menus, listas); as cores são fixas, então `color` é ignorado.
 */
const LifeRing = forwardRef<SVGSVGElement, LucideProps>(({ className, style, ...rest }, ref) => (
  <svg
    ref={ref}
    viewBox="0 0 48 48"
    className={className}
    style={{ ...style, color: undefined }}
    role="img"
    aria-hidden={rest['aria-hidden'] ?? true}
    aria-label={rest['aria-label']}
  >
    {/* 4 alternating bands forming the ring */}
    <circle
      cx="24" cy="24" r="16"
      fill="none"
      stroke="hsl(var(--sos-secondary))"
      strokeWidth="11"
      strokeDasharray="25.13 25.13"
      transform="rotate(-45 24 24)"
    />
    <circle
      cx="24" cy="24" r="16"
      fill="none"
      stroke="white"
      strokeWidth="11"
      strokeDasharray="25.13 25.13"
      strokeDashoffset="-25.13"
      transform="rotate(-45 24 24)"
    />
    {/* clean edges */}
    <circle cx="24" cy="24" r="21.5" fill="none" stroke="hsl(var(--sos-secondary-active))" strokeWidth="1.6" />
    <circle cx="24" cy="24" r="10.5" fill="none" stroke="hsl(var(--sos-secondary-active))" strokeWidth="1.6" />
    {/* center hole */}
    <circle cx="24" cy="24" r="9.7" fill="white" />
    {/* rope grips at the 4 band seams */}
    <g fill="hsl(var(--sos-secondary-active))">
      <rect x="22.5" y="1.5" width="3" height="5" rx="1.2" />
      <rect x="22.5" y="41.5" width="3" height="5" rx="1.2" />
      <rect x="1.5" y="22.5" width="5" height="3" rx="1.2" />
      <rect x="41.5" y="22.5" width="5" height="3" rx="1.2" />
    </g>
  </svg>
));
LifeRing.displayName = 'LifeRingIcon';

const LifeRingIcon = LifeRing as unknown as LucideIcon;

export default LifeRingIcon;
