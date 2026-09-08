interface LifeRingIconProps {
  className?: string;
}

/**
 * Hand-drawn nautical ring-buoy (alternating bands + rope grips), used
 * instead of lucide's abstract LifeBuoy where the SOS icon needs to read
 * clearly as a lifebuoy at a glance.
 */
const LifeRingIcon = ({ className }: LifeRingIconProps) => (
  <svg viewBox="0 0 48 48" className={className} role="img" aria-hidden="true">
    {/* 4 alternating bands forming the ring */}
    <circle
      cx="24" cy="24" r="16"
      fill="none"
      stroke="#EA580C"
      strokeWidth="11"
      strokeDasharray="25.13 25.13"
      transform="rotate(-45 24 24)"
    />
    <circle
      cx="24" cy="24" r="16"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="11"
      strokeDasharray="25.13 25.13"
      strokeDashoffset="-25.13"
      transform="rotate(-45 24 24)"
    />
    {/* clean edges */}
    <circle cx="24" cy="24" r="21.5" fill="none" stroke="#7C2D12" strokeWidth="1.6" />
    <circle cx="24" cy="24" r="10.5" fill="none" stroke="#7C2D12" strokeWidth="1.6" />
    {/* center hole */}
    <circle cx="24" cy="24" r="9.7" fill="white" />
    {/* rope grips at the 4 band seams */}
    <g fill="#7C2D12">
      <rect x="22.5" y="1.5" width="3" height="5" rx="1.2" />
      <rect x="22.5" y="41.5" width="3" height="5" rx="1.2" />
      <rect x="1.5" y="22.5" width="5" height="3" rx="1.2" />
      <rect x="41.5" y="22.5" width="5" height="3" rx="1.2" />
    </g>
  </svg>
);

export default LifeRingIcon;
