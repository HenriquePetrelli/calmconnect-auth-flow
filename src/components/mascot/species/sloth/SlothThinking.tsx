import { slothPalette as p } from '../../palette';
import { SlothBody, SlothLimb, SlothNose } from './SlothBase';

/** "Nothing here yet" pose — head scratch, curious sideways look. */
const SlothThinking = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Mascote pensativo, coçando a cabeça">
    <SlothLimb points="146,132 128,168" />
    <SlothLimb points="55,138 48,104 76,106" />

    <SlothBody />

    <SlothNose />

    {/* eyes glancing up-side, curious */}
    <circle cx="82" cy="80" r="12" fill="white" />
    <circle cx="118" cy="80" r="12" fill="white" />
    <circle cx="87" cy="76" r="6" fill={p.outline} />
    <circle cx="123" cy="76" r="6" fill={p.outline} />

    {/* small closed-mouth smile */}
    <path d="M92 104 Q100 108 108 104" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />

    {/* floating question mark */}
    <text x="150" y="52" fontSize="30" fontWeight={800} fill={p.furDark} fontFamily="sans-serif">?</text>
  </svg>
);

export default SlothThinking;
