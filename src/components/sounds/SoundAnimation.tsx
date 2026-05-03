import { cn } from "@/lib/utils";

interface SoundAnimationProps {
  type: string;
  isPlaying: boolean;
  soundName: string;
}

const SoundAnimation = ({ type, isPlaying, soundName }: SoundAnimationProps) => {
  const getAnimationClass = () => {
    if (!isPlaying) return "";
    
    switch (type) {
      case "waves":
        return "animate-pulse";
      case "forest":
        return "animate-bounce";
      case "clouds":
        return "animate-pulse";
      case "spirals":
        return "animate-spin";
      default:
        return "animate-pulse";
    }
  };

  const getGradient = () => {
    switch (type) {
      case "waves":
        return "from-secondary via-secondary to-secondary-hover";
      case "forest":
        return "from-green-400 via-green-500 to-green-600";
      case "clouds":
        return "from-gray-300 via-white to-muted";
      case "spirals":
        return "from-purple-400 via-pink-500 to-red-500";
      default:
        return "from-secondary via-secondary to-secondary-hover";
    }
  };

  const getPattern = () => {
    switch (type) {
      case "waves":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-white/30" />
            <div className="absolute w-24 h-24 rounded-full border-4 border-white/20" />
            <div className="absolute w-16 h-16 rounded-full border-4 border-white/10" />
          </div>
        );
      case "forest":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-20 bg-white/30 rounded-full mx-2" />
            <div className="w-8 h-24 bg-white/40 rounded-full mx-2" />
            <div className="w-6 h-18 bg-white/30 rounded-full mx-2" />
          </div>
        );
      case "clouds":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-12 bg-white/40 rounded-full" />
            <div className="absolute w-16 h-10 bg-white/30 rounded-full translate-x-4 translate-y-2" />
          </div>
        );
      case "spirals":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-white/30 rounded-full border-dashed" />
            <div className="absolute w-20 h-20 border-4 border-white/20 rounded-full border-dotted" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "w-full h-full rounded-full bg-gradient-to-br shadow-2xl relative overflow-hidden",
      getGradient(),
      getAnimationClass()
    )}>
      {/* Background Pattern */}
      {getPattern()}
      
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-2">
            {type === "waves" && "🌊"}
            {type === "forest" && "🌲"}
            {type === "clouds" && "☁️"}
            {type === "spirals" && "🌀"}
          </div>
          <p className="text-sm font-medium opacity-80">
            {isPlaying ? "Tocando..." : "Pausado"}
          </p>
        </div>
      </div>

      {/* Animated Overlay */}
      {isPlaying && (
        <div className="absolute inset-0 bg-white/10 rounded-full animate-ping" />
      )}
    </div>
  );
};

export default SoundAnimation;