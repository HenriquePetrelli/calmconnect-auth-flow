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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import BackButton from "@/components/BackButton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationFields } from "@/components/psychologist/LocationFields";
import { DocumentUpload } from "@/components/psychologist/DocumentUpload";

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
  accepts_presential: z.boolean(),
  address: z.string().optional(),
  document_url: z.string().min(1, "Documento é obrigatório"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.accepts_presential && !data.address) {
    return false;
  }
  return true;
}, {
  message: "Endereço é obrigatório quando atende presencialmente",
  path: ["address"],
});

type FormData = z.infer<typeof formSchema>;

const PsychologistSignUpPublic = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

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
      accepts_presential: false,
      address: "",
      document_url: "",
    },
  });

  const acceptsPresential = form.watch('accepts_presential');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    let authData: any = null;
    
    try {
      // First, sign up with auto-confirm to get user authenticated immediately for document upload
      const authResponse = await supabase.auth.signUp({
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
          },
          emailRedirectTo: `${window.location.origin}/psychologist-login`
        }
      });

      if (authResponse.error) throw authResponse.error;
      authData = authResponse.data;

      if (authData.user) {
        // Wait a moment for auth state to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Upload document if there's one stored temporarily
        let finalDocumentUrl = data.document_url;
        
        if (data.document_url.startsWith('temp://')) {
          const tempDocumentData = sessionStorage.getItem('temp_document');
          if (tempDocumentData) {
            try {
              const fileData = JSON.parse(tempDocumentData);
              
              // Convert data URL back to file
              const response = await fetch(fileData.dataUrl);
              const blob = await response.blob();
              const file = new File([blob], fileData.name, { type: fileData.type });
              
              // Upload to Supabase storage
              const fileExt = fileData.name.split('.').pop();
              const fileName = `${authData.user.id}/document_${crypto.randomUUID()}.${fileExt}`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('psychologist-documents')
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) throw uploadError;
              
              const { data: { publicUrl } } = supabase.storage
                .from('psychologist-documents')
                .getPublicUrl(uploadData.path);

              finalDocumentUrl = publicUrl;
              
              // Clear temporary storage
              sessionStorage.removeItem('temp_document');
            } catch (uploadError) {
              console.error('Erro no upload do documento:', uploadError);
              toast.error('Erro ao enviar documento. Tente novamente.');
              throw uploadError;
            }
          }
        }

        // Use the atomic stored procedure to create both psychologist and registration records
        const { data: profileResult, error: profileError } = await supabase.rpc('create_psychologist_profile', {
          p_user_id: authData.user.id,
          p_full_name: data.fullName,
          p_email: data.email,
          p_crp_number: data.crp,
          p_specialization: data.specialty,
          p_bio: data.bio,
          p_state: data.state,
          p_city: data.city,
          p_accepts_presential: data.accepts_presential,
          p_address: data.accepts_presential ? data.address : null,
          p_document_url: finalDocumentUrl,
          p_cpf: data.cpf,
          p_professional_email: data.professionalEmail
        });

        if (profileError) {
          console.error('Erro na stored procedure:', profileError);
          throw profileError;
        }

        // Type assertion for the stored procedure result
        const result = profileResult as { success?: boolean; error?: string };
        if (!result?.success) {
          throw new Error(result?.error || 'Falha ao criar perfil de psicólogo');
        }

        setIsSuccess(true);
        toast.success("Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.");
      }
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      // Rollback user creation if profile creation fails
      if (authData?.user && error.message?.includes('perfil')) {
        try {
          // Note: In a real application, this would require admin privileges
          // For now, we'll just log the issue
          console.warn('User created but profile failed. Manual cleanup may be required for user:', authData.user.id);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
      
      if (error.message?.includes('violates row-level security')) {
        toast.error("Erro de permissão. Tente novamente em alguns segundos.");
      } else if (error.message?.includes('duplicate key')) {
        toast.error("Email ou CRP já cadastrado. Use dados diferentes.");
      } else {
        toast.error(error.message || "Erro ao criar conta. Tente novamente.");
      }
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

                <FormField
                  control={form.control}
                  name="accepts_presential"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Atender presencialmente?
                        </FormLabel>
                        <FormDescription>
                          Marque se você oferece atendimento presencial em consultório
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {acceptsPresential && (
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço do Consultório *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Rua, número, bairro, CEP"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Endereço completo onde você atende presencialmente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DocumentUpload
                  userId="temp-user-id"
                  onFileChange={(url) => {
                    setDocumentUrl(url);
                    form.setValue('document_url', url || '');
                  }}
                  documentUrl={documentUrl}
                  error={!!form.formState.errors.document_url}
                />

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