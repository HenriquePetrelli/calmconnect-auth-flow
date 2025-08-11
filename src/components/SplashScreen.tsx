import Lottie from 'lottie-react';
import lotus from '@/assets/lotus-animation.json';

const SplashScreen = () => {
  return (
    <div role="dialog" aria-label="Tela de abertura Soliv" className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-40 h-40 md:w-56 md:h-56">
        <Lottie animationData={lotus} loop={false} autoplay />
      </div>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-primary animate-fade-in">Soliv</h1>
      <p className="mt-2 text-sm text-muted-foreground animate-fade-in">Cuidando do seu bem-estar</p>
    </div>
  );
};

export default SplashScreen;
