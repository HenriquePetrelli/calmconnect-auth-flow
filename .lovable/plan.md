# Configurar sincronização do projeto com GitHub

## Objetivo
Conectar o projeto Soliv a um repositório GitHub para que todo o código seja sincronizado automaticamente (push da Lovable → GitHub e pull do GitHub → Lovable).

## Estado atual
- O repositório remoto configurado aponta para o armazenamento Git privado da Lovable (`git.private.lovable-gcp.code.storage`), não para o GitHub.
- O histórico recente mostra commits locais/privados, mas nenhum push para GitHub.

## Passos do plano

1. **Preparar o projeto para publicação no GitHub**
   - Verificar se `.gitignore` está completo (dependências, builds, arquivos de ambiente).
   - Confirmar que `README.md` descreve o projeto de forma clara.
   - Garantir que não existam segredos hardcoded no código (chaves de API, tokens, etc.).

2. **Conectar GitHub via interface da Lovable**
   - No editor da Lovable, abrir o menu Plus (+) → GitHub → Connect project.
   - Autorizar o app da Lovable no GitHub.
   - Selecionar a conta/organização e criar o repositório.
   - Aguardar a sincronização inicial.

3. **Validar a sincronização**
   - Verificar no GitHub se o repositório foi criado e se os arquivos estão presentes.
   - Confirmar que o remote `origin` passou a apontar para o GitHub.
   - Fazer um commit de teste e verificar se reflete nos dois lados.

4. **Documentar no time (se necessário)**
   - Informar que a partir da conexão o fluxo é bidirecional.
   - Lembrar que apenas uma conta GitHub pode estar conectada por conta Lovable.

## Resultado esperado
Repositório GitHub ativo com o código do Soliv sincronizado em tempo real, permitindo backup, colaboração via pull requests e uso de GitHub Actions (incluindo o workflow `sos-e2e.yml` já existente).
