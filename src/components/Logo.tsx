interface LogoProps {
  className?: string;
}

const Logo = ({ className = "" }: LogoProps) => {
  return (
    <div className={`text-center ${className}`}>
      <h1 className="text-3xl font-bold text-primary animate-fade-in">
        CalmConnect
      </h1>
      <div className="w-16 h-1 bg-primary mx-auto mt-2 rounded-full"></div>
    </div>
  );
};

export default Logo;