import logoImg from '@/assets/soliv-logo.svg';

const SplashScreen = () => {
  return (
    <div role="dialog" aria-label="Tela de abertura Soliv" className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <img src={logoImg} alt="Logotipo Soliv" className="w-32 h-32 md:w-40 md:h-40 animate-fade-in" />
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-primary animate-fade-in">Soliv</h1>
      <p className="mt-2 text-sm text-muted-foreground animate-fade-in">Cuidando do seu bem-estar</p>
    </div>
  );
};

export default SplashScreen;
