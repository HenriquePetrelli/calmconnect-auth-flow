import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-base text-muted-foreground mb-4">Não encontramos esta página.</p>
        <a href="/" className="text-sm font-medium text-primary underline underline-offset-2">
          Voltar para o início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
