import logoImg from '@/assets/soliv-logo.png';

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "" }: LogoProps) => {
  return (
    <div className={`text-center ${className}`}>
      <h1 className="sr-only">Soliv</h1>
      <img
        src={logoImg}
        alt="Logotipo Soliv - bem-estar emocional"
        className="mx-auto h-12 w-auto md:h-14 animate-fade-in"
        loading="lazy"
      />
      <div className="w-16 h-1 bg-primary mx-auto mt-2 rounded-full"></div>
    </div>
  );
};

export default Logo;
