import logoImg from '@/assets/soliv-logo.webp';
import Wordmark from '@/components/Wordmark';

/** Tela de abertura; `message` (ex.: "Saindo da conta...") aparece abaixo da marca. */
const SplashScreen = ({ message }: { message?: string }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <img
          src={logoImg}
          alt="Soliv"
          className="h-24 w-auto select-none animate-scale-in"
          draggable={false}
        />
        <Wordmark className="h-[45px] text-primary" />
        <div className="mt-6 h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        {message && (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {message}
          </p>
        )}
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
