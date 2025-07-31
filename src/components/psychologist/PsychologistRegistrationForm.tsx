import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, X, CheckCircle } from 'lucide-react';
import { usePsychologistManagement } from '@/hooks/usePsychologistManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  crp_number: z.string().min(5, 'CRP deve ter pelo menos 5 caracteres'),
  specialization: z.string().optional(),
  bio: z.string().min(50, 'Biografia deve ter pelo menos 50 caracteres').max(500, 'Biografia deve ter no máximo 500 caracteres'),
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
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const { registerPsychologist, loading, validateCrpUnique } = usePsychologistManagement();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: userEmail,
      crp_number: '',
      specialization: '',
      bio: '',
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(data.path);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setDocuments([...documents, ...urls]);
      toast.success(`${files.length} documento(s) enviado(s) com sucesso`);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar documentos');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

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
      email: data.email,
      crp_number: data.crp_number,
      specialization: data.specialization,
      bio: data.bio,
      documents: documents
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
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
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
          Preencha as informações abaixo para se cadastrar como psicólogo na plataforma CalmConnect
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Profissional</FormLabel>
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
                  <FormLabel>Número do CRP</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 12/345678" {...field} />
                  </FormControl>
                  <FormDescription>
                    Informe seu número de registro no Conselho Regional de Psicologia
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialização (Opcional)</FormLabel>
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

            <div>
              <FormLabel>Documentos Comprobatórios</FormLabel>
              <div className="mt-2 space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Envie seus documentos (diploma, CRP, certificados)
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="documents"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('documents')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Escolher Arquivos'}
                  </Button>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Documentos enviados:</p>
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm truncate">Documento {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Importante:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Todos os documentos serão analisados pela nossa equipe</li>
                <li>• O processo de aprovação pode levar até 48 horas</li>
                <li>• Você receberá um email com o resultado da análise</li>
                <li>• Apenas psicólogos com CRP ativo serão aprovados</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading || uploading}>
              {loading ? 'Enviando...' : 'Enviar Cadastro'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};