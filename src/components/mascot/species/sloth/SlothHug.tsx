import { slothPalette as p } from '../../palette';
import { SlothBody, SlothLimb, SlothNose } from './SlothBase';

const Heart = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <path
    d={`M${x} ${y + size * 0.3}
        C${x - size} ${y - size * 0.6} ${x - size * 1.5} ${y + size * 0.5} ${x} ${y + size * 1.4}
        C${x + size * 1.5} ${y + size * 0.5} ${x + size} ${y - size * 0.6} ${x} ${y + size * 0.3} Z`}
    fill={p.blush}
    stroke={p.outline}
    strokeWidth="2"
  />
);

/** Comfort / reassurance pose — hugging a heart, soft calm eyes. */
const SlothHug = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Mascote abraçando um coração, transmitindo acolhimento">
    <SlothBody />

    {/* arms wrapped around the heart, in front of the belly */}
    <SlothLimb points="55,138 88,160 100,163" />
    <SlothLimb points="146,132 112,158 100,163" />

    <Heart x={100} y={150} size={13} />

    <SlothNose />

    {/* soft, content eyes */}
    <path d="M74 82 Q83 76 92 82" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />
    <path d="M108 82 Q117 76 126 82" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />

    <path d="M90 104 Q100 110 110 104" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default SlothHug;
