import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputMask from 'react-input-mask';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import BackButton from "@/components/BackButton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationFields } from "@/components/psychologist/LocationFields";
import { PsychologistService } from "@/services/psychologist.service";

const specializations = [
  'Psicologia Clínica',
  'Psicologia Organizacional',
  'Psicologia Escolar',
  'Neuropsicologia',
  'Psicologia Social',
  'Psicologia Hospitalar',
  'Psicologia do Esporte',
  'Psicologia Jurídica',
  'Psicanálise',
  'Terapia Cognitivo-Comportamental',
  'Gestalt-terapia',
  'Psicoterapia Humanística',
  'Outras'
];

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  fullName: z.string().min(2, "Nome completo é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  crp: z.string().min(5, "CRP é obrigatório"),
  professionalEmail: z.string().email("Email profissional inválido"),
  specialty: z.string().min(1, "Especialidade é obrigatória"),
  bio: z.string().min(50, "A biografia deve ter pelo menos 50 caracteres"),
  state: z.string().min(1, "Estado é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>;

const PsychologistSignUpPublic = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

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
      state: "",
      city: "",
      
      address: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!documentFile) {
      toast.error("Por favor, envie um documento comprovante.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await PsychologistService.signUpPsychologist(
        {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          cpf: data.cpf.replace(/\D/g, ''), // Remove formatação
          crp: data.crp,
          professionalEmail: data.professionalEmail,
          specialty: data.specialty,
          bio: data.bio,
          state: data.state,
          city: data.city,
          
          address: data.address,
        },
        documentFile
      );

      if (result.success) {
        setIsSuccess(true);
        toast.success("Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.");
      } else {
        toast.error(result.error || "Erro ao criar conta. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro no submit:', error);
      toast.error("Erro inesperado. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar arquivo
      const validation = PsychologistService.validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "Arquivo inválido");
        return;
      }
      
      setDocumentFile(file);
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
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
        </div>
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
                        <FormLabel>Nome Completo *</FormLabel>
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
                        <FormLabel>CPF *</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="999.999.999-99"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => <Input placeholder="000.000.000-00" {...inputProps} />}
                          </InputMask>
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
                        <FormLabel>Email *</FormLabel>
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
                        <FormLabel>Email Profissional *</FormLabel>
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
                        <FormLabel>Senha *</FormLabel>
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
                        <FormLabel>Confirmar Senha *</FormLabel>
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
                        <FormLabel>CRP *</FormLabel>
                        <FormControl>
                          <InputMask
                            mask="99/999999"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            {(inputProps: any) => <Input placeholder="XX/XXXXXX" {...inputProps} />}
                          </InputMask>
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
                        <FormLabel>Especialidade *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione sua especialização" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {specializations.map((spec) => (
                              <SelectItem key={spec} value={spec}>
                                {spec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <LocationFields form={form} />


                <div className="space-y-2">
                  <FormLabel>Documento de Identificação *</FormLabel>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required
                    className="w-full"
                  />
                  <FormDescription>
                    Envie documento de identidade, CNH ou CRP (PDF, JPG ou PNG - máx. 5MB)
                  </FormDescription>
                  {documentFile && (
                    <p className="text-sm text-green-600">
                      Arquivo selecionado: {documentFile.name}
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biografia Profissional *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={4}
                          placeholder="Descreva sua experiência, formação e abordagem terapêutica..."
                        />
                      </FormControl>
                      <FormDescription>
                        Entre 50 e 500 caracteres. Esta informação será exibida em seu perfil.
                      </FormDescription>
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