import { slothPalette as p } from '../../palette';
import { SlothBody, SlothLimb, SlothClaw, SlothNose, SlothBlush } from './SlothBase';

/** Default / greeting pose — friendly wave, open eyes, small smile. */
const SlothWave = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Mascote sorridente acenando">
    {/* resting arm, behind the body */}
    <SlothLimb points="55,138 48,170 45,182" />

    <SlothBody />

    {/* waving arm, in front */}
    <SlothLimb points="146,132 168,98 178,66" />
    <SlothClaw cx={178} cy={62} rotate={-20} />

    <SlothBlush />
    <SlothNose />

    {/* eyes */}
    <circle cx="82" cy="80" r="12" fill="white" />
    <circle cx="118" cy="80" r="12" fill="white" />
    <circle cx="84" cy="82" r="6" fill={p.outline} />
    <circle cx="120" cy="82" r="6" fill={p.outline} />
    <circle cx="86" cy="79" r="2" fill="white" />
    <circle cx="122" cy="79" r="2" fill="white" />

    {/* smile */}
    <path d="M88 104 Q100 112 112 104" fill="none" stroke={p.outline} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default SlothWave;
