import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import AdminCreateForm from "@/components/AdminCreateForm";
import { Shield, ArrowLeft } from "lucide-react";

const CreateAdminAccount = () => {
  const navigate = useNavigate();
  const [accountCreated, setAccountCreated] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo className="mb-8" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Criação de Conta Admin
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sistema de criação de conta administrativa
          </p>
        </div>

        <AdminCreateForm onSuccess={() => setAccountCreated(true)} />

        {!accountCreated && (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">Credenciais Padrão Sugeridas:</h3>
          <div className="text-sm text-amber-700 space-y-1">
            <p><strong>Email:</strong> admin@soliv.com</p>
            <p><strong>Senha:</strong> Será gerada automaticamente</p>
            <p><strong>Nome:</strong> Administrador do Sistema</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAdminAccount;