import { slothPalette as p } from '../../palette';
import { SlothBody, SlothLimb, SlothClaw, SlothNose, SlothBlush } from './SlothBase';

const Sparkle = ({ x, y, size = 8, color = p.leaf }: { x: number; y: number; size?: number; color?: string }) => (
  <path
    d={`M${x} ${y - size} L${x + size * 0.3} ${y - size * 0.3} L${x + size} ${y} L${x + size * 0.3} ${y + size * 0.3} L${x} ${y + size} L${x - size * 0.3} ${y + size * 0.3} L${x - size} ${y} L${x - size * 0.3} ${y - size * 0.3} Z`}
    fill={color}
  />
);

/** Achievement / success pose — arms up, cheering, sparkles all around. */
const SlothCelebrate = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 220" className={className} role="img" aria-label="Mascote comemorando com os braços para cima">
    <Sparkle x={24} y={40} size={7} />
    <Sparkle x={176} y={30} size={9} color="#F5C563" />
    <Sparkle x={160} y={110} size={6} color="#F0A28C" />
    <Sparkle x={38} y={110} size={6} color="#F5C563" />

    <SlothLimb points="55,138 30,86 20,52" />
    <SlothLimb points="146,132 170,86 180,52" />

    <SlothBody />

    <SlothClaw cx={20} cy={46} rotate={30} />
    <SlothClaw cx={180} cy={46} rotate={-30} />

    <SlothBlush />
    <SlothNose />

    {/* joyful upturned eyes */}
    <path d="M72 84 Q82 72 92 84" fill="none" stroke={p.outline} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M108 84 Q118 72 128 84" fill="none" stroke={p.outline} strokeWidth="3.5" strokeLinecap="round" />

    {/* big open smile */}
    <path
      d="M84 100 Q100 118 116 100 Q100 106 84 100 Z"
      fill={p.maskDark}
    />
  </svg>
);

export default SlothCelebrate;
