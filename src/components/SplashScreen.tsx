import logoImg from '@/assets/soliv-logo.svg';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <img
          src={logoImg}
          alt="Soliv"
          className="h-24 w-auto select-none animate-scale-in"
          draggable={false}
        />
        <span
          className="text-[64px] font-black text-secondary lowercase leading-none"
          style={{ fontFamily: "'El Messiri', sans-serif" }}
        >
          soliv
        </span>
        <div className="mt-6 h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
