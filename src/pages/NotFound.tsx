import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

/** Início de cada tipo de conta (visitante volta para o login). */
const HOME_BY_TYPE: Record<string, string> = {
  patient: "/home",
  psychologist: "/psychologist-dashboard",
  admin: "/admin-dashboard",
};

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const home = (user && HOME_BY_TYPE[userType]) || "/";

  useEffect(() => {
    console.warn("404: endereço inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border/60">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <SearchX className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Não encontramos esta página</h1>
          <p className="text-sm text-muted-foreground">
            O endereço <span className="break-all font-medium text-foreground">{location.pathname}</span> não existe no Soliv.
          </p>
          <Button className="mt-2 h-11 w-full" onClick={() => navigate(home, { replace: true })}>
            Voltar para o início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
