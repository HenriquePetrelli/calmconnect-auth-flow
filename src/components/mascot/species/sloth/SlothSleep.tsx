import { slothPalette as p } from '../../palette';
import { SlothBody, SlothLimb, SlothNose } from './SlothBase';

/** Calm / empty-state pose — dozing off, arms folded, "zzz" drifting up. */
const SlothSleep = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Mascote cochilando tranquilamente">
    <SlothBody />

    {/* arms folded in front, resting on the belly */}
    <SlothLimb points="55,138 85,158 100,163" />
    <SlothLimb points="146,132 116,156 100,163" />

    <SlothNose />

    {/* closed, content eyes */}
    <path d="M72 80 Q82 88 92 80" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />
    <path d="M108 80 Q118 88 128 80" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />

    {/* soft smile */}
    <path d="M92 104 Q100 108 108 104" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />

    {/* drifting zzz */}
    <text x="142" y="46" fontSize="16" fontWeight={700} fill={p.furDark} fontFamily="sans-serif">z</text>
    <text x="154" y="32" fontSize="20" fontWeight={700} fill={p.furDark} fontFamily="sans-serif">Z</text>
    <text x="169" y="16" fontSize="24" fontWeight={700} fill={p.furDark} fontFamily="sans-serif">Z</text>
  </svg>
);

export default SlothSleep;
