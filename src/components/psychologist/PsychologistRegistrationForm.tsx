import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InputMask from 'react-input-mask';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { usePsychologistManagement } from '@/hooks/usePsychologistManagement';
import { toast } from 'sonner';
import { LocationFields } from './LocationFields';
import { DocumentUpload } from './DocumentUpload';
import { TRANSTORNOS } from '@/data/transtornos';
import MultiSelectModal from '@/components/ui/multi-select-modal';

const formSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('Email inválido'),
  crp_number: z.string().min(5, 'CRP deve ter pelo menos 5 caracteres'),
  specialization: z.string().min(1, 'Especialização é obrigatória'),
  areasDeAtendimento: z.array(z.string()).min(1, 'Selecione pelo menos uma área de atendimento'),
  bio: z.string().min(50, 'Biografia deve ter pelo menos 50 caracteres').max(500, 'Biografia deve ter no máximo 500 caracteres'),
  state: z.string().min(1, 'Estado é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  address: z.string().optional(),
  document_url: z.string().min(1, 'Documento é obrigatório'),
});

type FormData = z.infer<typeof formSchema>;

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

interface PsychologistRegistrationFormProps {
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
}

export const PsychologistRegistrationForm = ({ 
  userId, 
  userEmail, 
  onSuccess 
}: PsychologistRegistrationFormProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isAreasModalOpen, setIsAreasModalOpen] = useState(false);
  
  const { registerPsychologist, loading, validateCrpUnique } = usePsychologistManagement();

const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    full_name: '',
    cpf: '',
    email: userEmail,
    crp_number: '',
    specialization: '',
    areasDeAtendimento: [],
    bio: '',
    state: '',
    city: '',
    address: '',
    document_url: '',
  },
});


  const onSubmit = async (data: FormData) => {
    // Validar CRP único
    const isCrpValid = await validateCrpUnique(data.crp_number);
    if (!isCrpValid) {
      form.setError('crp_number', { message: 'Este CRP já está cadastrado no sistema' });
      return;
    }

const registrationData = {
  user_id: userId,
  full_name: data.full_name,
  cpf: data.cpf,
  email: data.email,
  crp_number: data.crp_number,
  specialization: data.specialization,
  areasDeAtendimento: data.areasDeAtendimento,
  bio: data.bio,
  state: data.state,
  city: data.city,
  address: data.address,
  document_url: data.document_url
};

    const result = await registerPsychologist(registrationData);
    
    if (result.success) {
      setSubmitted(true);
      onSuccess?.();
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Cadastro Enviado com Sucesso!
          </h2>
          <p className="text-muted-foreground mb-4">
            Seu cadastro como psicólogo foi enviado para análise. Você receberá um email com a resposta em até 48 horas.
          </p>
          <Badge variant="secondary" className="text-sm">
            Status: Aguardando Aprovação
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Cadastro de Psicólogo</CardTitle>
        <CardDescription>
          Preencha as informações abaixo para se cadastrar como psicólogo na plataforma Soliv
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
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
                  <FormLabel>Email Pessoal</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled />
                  </FormControl>
                  <FormDescription>
                    O email da sua conta será usado para comunicações oficiais
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="crp_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do CRP *</FormLabel>
                  <FormControl>
                    <InputMask
                      mask="99/999999"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {(inputProps: any) => <Input placeholder="XX/XXXXXX" {...inputProps} />}
                    </InputMask>
                  </FormControl>
                  <FormDescription>
                    Informe seu número de registro no Conselho Regional de Psicologia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LocationFields form={form} />

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialização *</FormLabel>
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

            <FormField
              control={form.control}
              name="areasDeAtendimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Áreas de Atendimento *</FormLabel>
                  <FormControl>
                    <MultiSelectModal
                      options={[...TRANSTORNOS]}
                      selectedValues={field.value || []}
                      onSelectionChange={field.onChange}
                      placeholder="Selecione as áreas de atendimento"
                      title="Selecionar áreas de atendimento"
                      isOpen={isAreasModalOpen}
                      onOpenChange={setIsAreasModalOpen}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço do Consultório</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rua, número, bairro, CEP"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Opcional. Informe se desejar exibir um endereço de atendimento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografia Profissional</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva sua experiência, abordagens terapêuticas e áreas de atuação..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Entre 50 e 500 caracteres. Esta informação será exibida em seu perfil.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DocumentUpload
              userId={userId}
              onFileChange={(url) => {
                setDocumentUrl(url);
                form.setValue('document_url', url || '');
              }}
              documentUrl={documentUrl}
              error={!!form.formState.errors.document_url}
            />

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Importante:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Todos os documentos serão analisados pela nossa equipe</li>
                <li>• O processo de aprovação pode levar até 48 horas</li>
                <li>• Você receberá um email com o resultado da análise</li>
                <li>• Apenas psicólogos com CRP ativo serão aprovados</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Cadastro'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};