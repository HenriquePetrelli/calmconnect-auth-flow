# Soliv

Aplicativo de apoio emocional e saúde mental que conecta pacientes a psicólogos, oferecendo ferramentas de bem-estar, acompanhamento de humor, diário privado, respiração guiada, grupos de apoio e atendimento emergencial (SOS).

## URL do projeto

https://lovable.dev/projects/82bda655-81e5-448f-832e-ea464e8925dc

## Tecnologias

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (banco de dados, auth e edge functions)
- Playwright (testes E2E)
- Vitest (testes de integração)

## Estrutura principal

```text
src/
  components/     Componentes reutilizáveis e telas específicas
  contexts/       Contextos de autenticação e assinatura
  hooks/          Hooks customizados (SOS, presença, WebRTC, etc.)
  lib/            Utilitários e lógica de negócio
  pages/          Páginas da aplicação
  services/       Serviços de matching e psicólogos
supabase/
  functions/      Edge Functions do Supabase
```

## Como executar localmente

```sh
# 1. Clone o repositório
git clone <URL_DO_GITHUB>

# 2. Acesse a pasta do projeto
cd soliv

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha as credenciais do Supabase e outros serviços. Nunca commit arquivos `.env` com valores reais.

## Testes

```sh
# Testes de integração / unitários
npx vitest run

# Testes E2E
npx playwright test
```

## Deploy

O deploy é feito pela Lovable em https://lovable.dev/projects/82bda655-81e5-448f-832e-ea464e8925dc (Share → Publish).

## Sincronização com GitHub

Este projeto utiliza o Git sync da Lovable: alterações feitas na Lovable são commitadas automaticamente no GitHub, e pushes feitos no GitHub refletem na Lovable.

## Documentação viva

Veja `docs/visao-geral-do-produto.md` para o mapeamento completo de funcionalidades, regras de negócio e arquitetura.
