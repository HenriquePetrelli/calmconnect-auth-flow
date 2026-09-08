import { slothPalette as p } from '../../palette';

/**
 * Shared body/head/mask shell every sloth pose sits on top of, so poses only
 * need to differ in arms, face and small decorations instead of redrawing
 * the whole character each time.
 */
export const SlothBody = () => (
  <>
    {/* legs poking out from under the body */}
    <ellipse cx="72" cy="192" rx="16" ry="11" fill={p.furMid} stroke={p.outline} strokeWidth="2.5" />
    <ellipse cx="128" cy="192" rx="16" ry="11" fill={p.furMid} stroke={p.outline} strokeWidth="2.5" />
    <ellipse cx="67" cy="196" rx="4" ry="3" fill={p.outline} />
    <ellipse cx="77" cy="197.5" rx="4" ry="3" fill={p.outline} />
    <ellipse cx="123" cy="197.5" rx="4" ry="3" fill={p.outline} />
    <ellipse cx="133" cy="196" rx="4" ry="3" fill={p.outline} />

    {/* body */}
    <ellipse cx="100" cy="150" rx="56" ry="50" fill={p.furMid} stroke={p.outline} strokeWidth="3" />
    <ellipse cx="100" cy="162" rx="32" ry="30" fill={p.belly} />

    {/* head */}
    <circle cx="100" cy="84" r="49" fill={p.furLight} stroke={p.outline} strokeWidth="3" />

    {/* forehead fur tuft */}
    <path
      d="M67 52 Q72 34 84 42 Q90 28 100 40 Q110 28 116 42 Q128 34 133 52"
      fill="none"
      stroke={p.furDark}
      strokeWidth="4"
      strokeLinecap="round"
    />

    {/* signature sloth eye-mask marking */}
    <path
      d="M56 78 Q62 60 88 66 Q100 70 112 66 Q138 60 144 78 Q130 92 100 90 Q70 92 56 78 Z"
      fill={p.mask}
    />
  </>
);

/** A limb drawn as a thick round-capped stroke between two or three points. */
export const SlothLimb = ({ points }: { points: string }) => (
  <>
    <polyline
      points={points}
      fill="none"
      stroke={p.outline}
      strokeWidth="26"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points={points}
      fill="none"
      stroke={p.furMid}
      strokeWidth="20"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

export const SlothClaw = ({ cx, cy, rotate = 0 }: { cx: number; cy: number; rotate?: number }) => (
  <g transform={`rotate(${rotate} ${cx} ${cy})`}>
    <ellipse cx={cx - 6} cy={cy} rx="3.2" ry="4.5" fill={p.outline} />
    <ellipse cx={cx} cy={cy - 1} rx="3.2" ry="4.5" fill={p.outline} />
    <ellipse cx={cx + 6} cy={cy} rx="3.2" ry="4.5" fill={p.outline} />
  </g>
);

export const SlothNose = () => <ellipse cx="100" cy="98" rx="7" ry="5" fill={p.maskDark} />;

export const SlothBlush = () => (
  <>
    <ellipse cx="68" cy="92" rx="8" ry="5" fill={p.blush} opacity={0.6} />
    <ellipse cx="132" cy="92" rx="8" ry="5" fill={p.blush} opacity={0.6} />
  </>
);
