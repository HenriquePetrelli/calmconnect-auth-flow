import logoImg from '@/assets/soliv-logo.svg';

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "" }: LogoProps) => {
  return (
    <div className={`text-center ${className}`}>
      <h1 className="sr-only">soliv</h1>
      <img
        src={logoImg}
        alt="Logotipo Soliv - bem-estar emocional"
        className="mx-auto h-16 w-auto animate-fade-in"
        loading="lazy"
      />
    </div>
  );
};

export default Logo;
