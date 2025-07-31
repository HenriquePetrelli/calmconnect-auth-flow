import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  fullName: z.string().min(2, "Nome completo é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  crp: z.string().min(5, "CRP é obrigatório"),
  professionalEmail: z.string().email("Email profissional inválido"),
  specialty: z.string().min(2, "Especialidade é obrigatória"),
  bio: z.string().min(50, "A biografia deve ter pelo menos 50 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const PsychologistSignUpPublic = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      cpf: "",
      crp: "",
      professionalEmail: "",
      specialty: "",
      bio: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Create account with user metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            user_type: 'psychologist',
            full_name: data.fullName,
            cpf: data.cpf,
            crp: data.crp,
            professional_email: data.professionalEmail,
            specialty: data.specialty,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create psychologist registration entry
        const { error: psychError } = await supabase.from('psychologists').insert({
          user_id: authData.user.id,
          full_name: data.fullName,
          email: data.email,
          crp_number: data.crp,
          specialization: data.specialty,
          bio: data.bio,
          approval_status: 'pending',
        });

        if (psychError) throw psychError;

        setIsSuccess(true);
        toast.success("Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.");
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <Logo className="mb-12" />
          
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-green-600">Cadastro Realizado!</CardTitle>
              <CardDescription>
                Seu cadastro foi enviado para análise. Você receberá um email quando for aprovado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/psychologist-login')}
                className="w-full"
              >
                Fazer Login
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <Logo className="mb-12" />
        
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de Psicólogo</CardTitle>
            <CardDescription>
              Preencha seus dados profissionais para se cadastrar como psicólogo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="000.000.000-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Profissional</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="crp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CRP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="XX/XXXXXX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biografia Profissional</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          placeholder="Descreva sua experiência, formação e abordagem terapêutica..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <button
            onClick={() => navigate('/psychologist-login')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Já tem uma conta? Faça login aqui
          </button>
        </div>
      </div>
    </div>
  );
};

export default PsychologistSignUpPublic;