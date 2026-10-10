# Roteiro de testes do app

Formato: **quem → onde → o que fazer** ⇒ resultado esperado. Marque `[x]` quando passar.
Se falhar, a ficha indicada em cada seção (`docs/fluxos/`) diz o que olhar.

**Contas necessárias:** Paciente A (Premium), Paciente B (Plus), Paciente C (sem plano), Psicólogo aprovado, Admin.
**Aparelhos:** dois (ou dois navegadores, um em janela anônima). Um celular para push.

---

## 1. Contas e acesso (ficha 01)

- [ ] Visitante → Cadastro paciente → senha `abc123` ⇒ recusa (mínimo 8)
- [ ] Visitante → Cadastro paciente → senha `calma2024` ⇒ entra na Home
- [ ] Visitante → Login → senha errada ⇒ "Email ou senha incorretos"
- [ ] Visitante → Login → Esqueci a senha → link do e-mail → nova senha ⇒ entra com ela
- [ ] E-mail de redefinir senha ⇒ em português, com a logo do Soliv (sem domínio próprio só chega a quem é da equipe do Supabase)
- [ ] Visitante → Cadastro paciente → preenchimento automático do navegador (endereço) ⇒ estado **e** cidade preenchidos
- [ ] Paciente → Perfil → Sair ⇒ "Saindo da conta..." aparece na hora; volta ao login; botão voltar não reabre o app
- [ ] Sair sem internet ⇒ sai mesmo assim em poucos segundos
- [ ] Psicólogo em análise → Login ⇒ só o aviso "Seu cadastro ainda está sendo analisado" (sem "Erro ao verificar assinatura" nem tela de erro)
- [ ] Paciente → abrir `/admin-dashboard` na barra ⇒ redirecionado
- [ ] Visitante → Cadastro psicólogo → enviar documentos + aceitar termos do psicólogo ⇒ cadastro enviado, volta ao login (sem carregamento infinito)
- [ ] Cadastro psicólogo → anexar arquivo inválido (ex.: `.exe` ou grande demais) ⇒ aviso em vermelho e campo limpo
- [ ] Cadastro psicólogo → anexar documento válido ⇒ "Arquivo escolhido: nome"; documento aparece para o admin
- [ ] Cadastro psicólogo → preenchimento automático do navegador ⇒ estado e cidade preenchidos
- [ ] Psicólogo bloqueado → Login ⇒ vê o motivo e não entra
- [ ] Paciente → Perfil → Conta → Meus sintomas → Confirmar ⇒ a janela fecha e aparece "Sintomas atualizados" no perfil
- [ ] Paciente → Perfil → Preferências → Tema → escuro ⇒ app inteiro muda de tema
- [ ] Paciente → Perfil → Preferências → Humor diário → desligar ⇒ Home não pede mais o humor
- [ ] Psicólogo → Perfil → Alterar senha (senha atual errada) ⇒ recusa; certa ⇒ troca
- [ ] Paciente → Configurações da conta → Alterar senha com `abc123` ⇒ recusa (mínimo 8)
- [ ] Paciente → Configurações da conta → editar nome → salvar ⇒ Perfil mostra o nome novo
- [ ] Conta que ainda não aceitou a versão atual dos termos → entrar ⇒ pede o aceite antes de usar o app
- [ ] Abrir qualquer tela pela primeira vez ⇒ esqueleto de carregamento com o formato da própria tela
- [ ] Psicólogo → Perfil → editar especialização e biografia → salvar ⇒ paciente vê os dados novos ao agendar
- [ ] Qualquer → abrir endereço inexistente (`/xyz`) ⇒ "Não encontramos esta página"; "Voltar para o início" leva à Home, ao painel ou ao login
- [ ] Com "Confirmar e-mail" ligado → cadastro de paciente ⇒ "Conta criada! Enviamos um link..."; depois de confirmar e entrar, CPF, cidade e sintomas estão no perfil
- [ ] Cadastro de paciente com CPF já usado ⇒ nenhuma conta é criada; aviso para entrar ou recuperar a senha
- [ ] Com "Confirmar e-mail" ligado → cadastro de psicólogo → confirmar → entrar ⇒ tela "Falta pouco" pede o documento do CRP; ao enviar, vai para análise
- [ ] Admin bloqueia um paciente que está com o app aberto ⇒ em até 5 minutos (ou ao voltar para o app) vê o motivo e sai da conta; não consegue entrar de novo até o fim do bloqueio
- [ ] Admin desbloqueia ⇒ a pessoa entra normalmente
- [ ] Login com e-mail com espaço ou maiúscula ⇒ entra normalmente

## 2. SOS (fichas 02 e 03)

- [ ] Paciente → botão de SOS (celular e computador) ⇒ abre a confirmação "Precisa de ajuda agora?"; "Agora não" fecha sem pedir SOS
- [ ] Paciente A → SOS (sem psicólogo online) ⇒ "Nenhum psicólogo online agora" e o pedido continua na fila
- [ ] Psicólogo → Início → ficar Online ⇒ Paciente A vê "1 profissional disponível"
- [ ] Paciente A → SOS → pedir ajuda ⇒ pedido aparece no painel do psicólogo em até 10 s
- [ ] Psicólogo → Aceitar ⇒ os dois na sala, com vídeo e áudio
- [ ] Na chamada → mutar / desligar câmera ⇒ aparece do outro lado
- [ ] Na chamada → desligar Wi-Fi de um lado por 20 s ⇒ "Tentando reconectar" e volta sozinha
- [ ] Na chamada → recarregar a página (F5) ⇒ volta à mesma sala, cronômetro continua
- [ ] Na chamada → desligar câmera e microfone → F5 ⇒ voltam desligados de verdade (luz da câmera apagada; o outro lado não ouve nem vê)
- [ ] Na chamada → desligar a câmera ⇒ a luz da câmera do aparelho apaga; religar ⇒ imagem volta dos dois lados
- [ ] Paciente e psicólogo lado a lado ⇒ cronômetro igual nos dois; antes de o segundo entrar mostra "25:00 · aguardando"
- [ ] Na chamada → redimensionar, maximizar, minimizar e voltar para a janela ⇒ continua na chamada
- [ ] Psicólogo → Encerrar ⇒ Paciente A vê a avaliação obrigatória
- [ ] Paciente A → SOS de novo no mesmo mês ⇒ tela "Você já usou o SOS deste mês" (sem busca), com CVV, respirar, plano de segurança e agendar consulta
- [ ] Paciente B → SOS → fechar o app antes do aceite ⇒ pedido some do painel do psicólogo
- [ ] Paciente B → SOS → Cancelar pedido ⇒ some do painel do psicólogo na hora (sem recarregar)
- [ ] Paciente B → SOS → esperar 10 min sem aceite ⇒ "Ninguém atendeu" + CVV + "Tentar de novo"
- [ ] Paciente B → SOS aceito → psicólogo fecha o app → 90 s ⇒ "Chamar outro psicólogo" (cota não é gasta)
- [ ] Paciente B → SOS → psicólogo aceita e encerra sem o paciente entrar ⇒ SOS do mês volta
- [ ] Paciente B → SOS na fila → abrir Respirar / Meu plano ⇒ pedido continua na fila
- [ ] Paciente C (sem plano) → SOS ⇒ não consegue pedir; convite para assinar
- [ ] Psicólogo (app fechado, push ativo) → paciente pede SOS ⇒ push imediato
- [ ] Psicólogo → Início → desligar o status do SOS (Offline) ⇒ paciente vê "Nenhum psicólogo online agora"
- [ ] Psicólogo online → Sair da conta ⇒ fica Offline automaticamente
- [ ] Psicólogo → SOS aceito → Contexto do paciente ⇒ identificação, sintomas relatados e histórico de pedidos
- [ ] Na chamada → Configurações → trocar microfone/câmera ⇒ troca sem derrubar a chamada
- [ ] Paciente → encerrar SOS e fechar o app antes de avaliar → reabrir ⇒ pede a avaliação
- [ ] Admin → Atendimento → SOS ⇒ solicitações, atendidas, tempo até aceite e duração média
- [ ] Paciente → SOS em duas abas ao mesmo tempo ⇒ um pedido só na fila do psicólogo
- [ ] Psicólogo em um SOS → aceitar outro pedido (outra aba) ⇒ "Você já está em um atendimento de emergência"
- [ ] Psicólogo em análise ou bloqueado ⇒ não vê a fila do SOS
- [ ] Paciente → SOS aceito → cancelar antes de a chamada conectar ⇒ SOS do mês volta
- [ ] Paciente → Chamar outro psicólogo ⇒ o psicólogo que sumiu vê "Atendimento encaminhado" ao voltar para a sala

## 3. Consultas agendadas (fichas 04 e 05)

- [ ] Psicólogo → Agenda → definir horário-padrão → salvar
- [ ] Psicólogo → Agenda → Agenda semanal → bloquear 14h de amanhã ⇒ paciente não vê 14h amanhã
- [ ] Psicólogo → Agenda → Agenda semanal ⇒ sem os botões "Editar horário padrão" e "Tirar férias"
- [ ] Psicólogo → Agenda → Férias → escolher de-até → Agendar férias ⇒ nenhum horário nesses dias; cartão "Férias agendadas" na Agenda
- [ ] Psicólogo → Agenda → Férias → Cancelar férias ⇒ horários voltam
- [ ] Psicólogo → Agenda → Férias com início depois do fim ⇒ recusado
- [ ] Paciente A pede 10h → Paciente B abre o mesmo psicólogo e dia ⇒ 10h aparece ocupado
- [ ] Psicólogo propõe 15h ao Paciente A → Paciente B abre o mesmo dia ⇒ 15h aparece ocupado
- [ ] Paciente com o aparelho no fuso de Manaus ⇒ horários iguais aos do psicólogo (Brasília)
- [ ] Psicólogo com "até 60 dias à frente" ⇒ paciente consegue escolher dia depois de 30 dias
- [ ] Paciente → horário que outro paciente acabou de pegar → Agendar ⇒ "Este horário já está ocupado" e a lista atualiza
- [ ] Paciente → pedido com novo horário proposto, depois do horário original → Cancelar ⇒ cancela e a consulta do mês volta
- [ ] Paciente A → Consultas → Agendar → psicólogo → horário ⇒ "Aguardando confirmação"
- [ ] Paciente A → Consultas → Agendar → lista de psicólogos ⇒ mostra consultas, SOS atendidos e a nota real (ou "Sem avaliações ainda"); não mostra cidade nem estado
- [ ] Paciente A → Consultas → Agendar (toque duplo rápido) ⇒ só uma consulta criada
- [ ] Paciente A → Consultas → Agendar outra no mês ⇒ aviso de cota usada
- [ ] Paciente B (Plus) → Consultas → Agendar ⇒ "disponível apenas no Premium"
- [ ] Psicólogo → Consultas → Próximas → pedido → Aceitar ⇒ paciente recebe "Consulta confirmada"
- [ ] Psicólogo → Consultas → pedido → Propor outro horário → Paciente aceita ⇒ horário muda nos dois
- [ ] Psicólogo → Consultas → pedido → Recusar ⇒ consulta do mês volta para o paciente
- [ ] Paciente A → Consultas → Cancelar (mais de 24 h antes) ⇒ aviso "a consulta do mês volta"
- [ ] Paciente A → Consultas → Cancelar (menos de 24 h antes) ⇒ aviso "conta como usada"
- [ ] Psicólogo → Consultas → Cancelar consulta confirmada ⇒ paciente avisado, consulta do mês volta
- [ ] Os dois → 10 min antes → Entrar ⇒ chamada conecta
- [ ] Psicólogo → Encerrar ⇒ paciente avalia (nota + comentário)
- [ ] Um lado sozinho na sala → 2 min → Avisar ⇒ o outro recebe push
- [ ] Psicólogo sozinho → sair da sala ⇒ "Você saiu da sala"; consulta segue "Em andamento"
- [ ] Ninguém conecta → 30 min após o fim ⇒ "Não realizada", consulta do mês volta
- [ ] Paciente A → Consultas → Histórico → Avaliar ⇒ nota entra na média do psicólogo
- [ ] Paciente A → Consultas → Histórico → Relatar problema ⇒ psicólogo é avisado
- [ ] Psicólogo → Consultas → Histórico → Consulta interrompida ⇒ consulta do mês volta ao paciente
- [ ] Psicólogo → Consultas → Histórico → Salvar resumo da sessão ⇒ salva sem mudar o status
- [ ] Lembretes: consulta marcada para daqui a 1 h ⇒ lembrete no app e push
- [ ] Psicólogo → Consultas → consulta → Histórico do paciente ⇒ consultas anteriores e resumos
- [ ] Paciente → encerrar consulta e fechar o app antes de avaliar → reabrir ⇒ convite para avaliar (pode pular)
- [ ] Psicólogo → Agenda → antecedência mínima 2 h ⇒ paciente não marca para daqui a 1 h
- [ ] Psicólogo → Notificações ⇒ pedidos, confirmações e lembretes listados
- [ ] Psicólogo (celular) → barra inferior ⇒ Início, Consultas, Agenda, Chat e Perfil; no computador, menu lateral com Pagamentos e o status do SOS
- [ ] Psicólogo online → abrir Agenda ou Chat → paciente pede SOS ⇒ aviso "pedido de SOS esperando" leva ao Início
- [ ] Psicólogo → Chat ⇒ abre com a navegação do psicólogo (sem a barra e o SOS do paciente)
- [ ] Paciente com Consultas aberta → psicólogo aceita (ou propõe outro horário) ⇒ a lista do paciente muda sozinha, sem recarregar
- [ ] Psicólogo com Início/Consultas aberto → paciente pede consulta ⇒ o pedido aparece sozinho
- [ ] Psicólogo abre um pedido → paciente cancela → psicólogo toca em Aceitar ⇒ "Esta consulta mudou enquanto você respondia"; a consulta continua cancelada
- [ ] Agendar com a internet caindo no envio → tentar de novo ⇒ um pedido só, sem "limite do mês já usado"
- [ ] Psicólogo propõe a um paciente um horário que outro paciente está pedindo ao mesmo tempo ⇒ só um dos dois consegue
- [ ] Consulta com lembrete de 24 h já enviado → paciente aceita novo horário ⇒ recebe os lembretes do horário novo
- [ ] Pedido sem resposta por 24 h ⇒ paciente avisado e psicólogo recebe "Pedido de consulta expirou"
- [ ] Psicólogo → Histórico → resumo da sessão ⇒ aviso de que o paciente vê o resumo
- [ ] Psicólogo com consulta marcada → Agenda → Férias cobrindo o dia ⇒ o modal lista a consulta antes de confirmar; com "Cancelar essas consultas" marcado, o paciente é avisado e a consulta do mês volta
- [ ] Férias desmarcando "Cancelar essas consultas" ⇒ as consultas continuam marcadas, com aviso ao psicólogo
- [ ] Psicólogo → Agenda semanal → bloquear o horário de uma consulta marcada (inclusive pela API) ⇒ recusado: "Esse horário tem consulta marcada"
- [ ] Visitante sem login → ler férias/horários dos psicólogos pela API ⇒ nada retorna

## 4. Chat (ficha 06)

- [ ] Paciente C (sem consulta concluída) → Chat → iniciar com psicólogo ⇒ não permite
- [ ] Paciente A (consulta concluída) → Chat → nova conversa → "oi" ⇒ chega na hora, com contador
- [ ] Psicólogo → Chat → abrir conversa ⇒ no paciente, dois checks
- [ ] Paciente A → Chat → enviar foto (celular/iPhone) ⇒ abre do outro lado
- [ ] Psicólogo sem Wi-Fi → paciente manda 2 mensagens → religar ⇒ aparecem sem recarregar
- [ ] Psicólogo (app fechado) → paciente manda mensagem ⇒ push "Nova mensagem"
- [ ] Paciente A → Chat → excluir conversa ⇒ some só para ele; volta se o psicólogo escrever
- [ ] Conversa com mais de 1 mês sem nova consulta ⇒ "Somente leitura" (conferir no banco, ficha 06)
- [ ] Paciente A → Chat → enviar foto ⇒ abre para o psicólogo; outra conta (Paciente B) não consegue abrir o link da foto
- [ ] Foto enviada antes desta versão ⇒ continua abrindo para os dois participantes
- [ ] Conversa somente leitura → tentar enviar ⇒ caixa de texto bloqueada; se insistir pela API, "Esta conversa está somente leitura"
- [ ] Paciente sem internet → mandar "um" e "dois" ⇒ "Não enviada"; religar ⇒ saem sozinhas, uma vez cada, na ordem
- [ ] Sem internet → mandar mensagem → recarregar a página ⇒ continua como "Não enviada" e sai quando a internet volta
- [ ] Conversa aberta em aba de fundo → chega mensagem ⇒ do outro lado fica um check; voltar à aba ⇒ dois checks
- [ ] Lendo mensagens antigas → chega mensagem ⇒ a tela não pula; aparece "1 nova mensagem"
- [ ] Abrir conversa → voltar do celular ⇒ volta para a lista; recarregar com a conversa aberta ⇒ continua nela
- [ ] Enter envia; Shift+Enter quebra a linha
- [ ] Escrever uma mensagem sem enviar → sair da conversa (ou recarregar) → voltar ⇒ o texto continua na caixa
- [ ] Mandar foto grande do celular (8–12 MB) ⇒ é reduzida e enviada (antes: recusada acima de 5 MB)
- [ ] Deixar a conversa aberta mais de 1 hora → abrir uma foto ⇒ continua abrindo
- [ ] Conversa com mais de 200 mensagens → abrir ⇒ mostra as mais recentes; "Ver mensagens anteriores" traz as antigas sem pular a tela
- [ ] Sair da conta com mensagem "Não enviada" → entrar com outra conta no mesmo aparelho ⇒ nada da conta anterior aparece nem é enviado
- [ ] Abrir link de conversa apagada (ou de outra pessoa) ⇒ "Conversa não encontrada" com botão para a lista
- [ ] Conversa aberta em aba de fundo → chega mensagem ⇒ aviso do navegador discreto (sem texto nem nome)
- [ ] Paciente ocultou a conversa → nova consulta concluída ⇒ a conversa volta para a lista dele, ativa

## 5. Notificações e push (ficha 07)

- [ ] Paciente → Perfil → Notificações push → ativar ⇒ navegador pede permissão
- [ ] App fechado → mensagem de outra conta ⇒ push em até 1 min; tocar abre a própria conversa
- [ ] Push de mensagem na tela bloqueada ⇒ "Você tem uma nova mensagem" (sem o nome de quem mandou)
- [ ] App aberto em outra tela → chega um aviso ⇒ aparece na tela com "Abrir"
- [ ] App aberto no navegador → tocar no push ⇒ abre na mesma aba (não abre outra)
- [ ] Notificações → abrir um aviso não lido ⇒ o número do sino baixa na hora
- [ ] Notificações no celular → cada aviso tem o botão de excluir visível
- [ ] Notificações → Excluir todas ⇒ pede confirmação antes de apagar
- [ ] Psicólogo com push ativo → paciente pede SOS → tocar no push ⇒ abre a fila do SOS
- [ ] Paciente → Sair → nova mensagem ⇒ **não** chega push nesse aparelho
- [ ] Paciente → Notificações ⇒ lista com não lidas; tocar leva à tela certa

## 6. Assinaturas (ficha 08)

- [ ] Paciente C → Planos → Plus → pagar ⇒ tela de sucesso; Perfil mostra Plus
- [ ] Paciente → Planos → subir para Premium ⇒ prévia do valor proporcional → Premium na hora
- [ ] Paciente → Planos → descer para Plus ⇒ "vale na renovação"
- [ ] Paciente → Planos → Cancelar (após 7 dias) ⇒ Perfil e Planos mostram "Plano cancelado - Plus disponível até dd/mm/aaaa" → "Manter" desfaz
- [ ] Plano cancelado → passar a data de fim (relógio de teste do Stripe) ⇒ Perfil mostra "Plano Grátis"; SOS pede plano
- [ ] Paciente → Planos → Cancelar (até 7 dias) ⇒ acaba na hora, reembolso no Stripe
- [ ] Cartão `4000 0000 0000 0341` na renovação ⇒ aviso para atualizar o cartão
- [ ] Paciente → Planos → assinar → fechar o checkout sem pagar ⇒ "Pagamento não concluído", plano não muda
- [ ] Paciente → Planos → Gerenciar pagamento ⇒ abre o portal do Stripe
- [ ] Paciente → Planos → Assinar (toque duplo rápido) ⇒ um checkout só; no Stripe, uma assinatura
- [ ] Conta A com assinatura troca de e-mail → conta B se cadastra com o e-mail antigo ⇒ B fica sem plano (não herda o de A)
- [ ] Psicólogo e admin → entrar ⇒ nenhum aviso de assinatura
- [ ] Paciente Premium com consulta marcada → cancelar em até 7 dias ⇒ aviso de que a consulta também será cancelada; depois do cancelamento, o psicólogo recebe "Consulta cancelada"
- [ ] Cartão 4000 0000 0000 0341 → renovação recusada ⇒ aviso "Pagamento não aprovado" no sino e por push, uma vez por dia
- [ ] Plano termina (fim do período, arrependimento ou saída da empresa) ⇒ aviso "Seu plano terminou" com link para os planos
- [ ] Paciente com Premium da empresa → tentar assinar Plus ou Premium pela API ⇒ "Seu plano já vem da empresa"; nenhum checkout
- [ ] Conta A troca de e-mail → conta B se cadastra com o e-mail antigo → B abre o app ⇒ A continua com o plano e o cliente do Stripe dela; B ganha linha própria, sem plano

## 7. Repasses (ficha 09)

- [ ] Admin → Financeiro → Repasses → Sincronizar ⇒ psicólogo com consulta (R$ 90) + SOS (R$ 50)
- [ ] Admin → Repasses → Sincronizar de novo ⇒ valor não duplica
- [ ] Admin → Repasses → Confirmar → E2E de 32 caracteres + comprovante ⇒ pendente zera
- [ ] Admin → Repasses → Confirmar com o mesmo E2E ⇒ recusado
- [ ] Psicólogo → Pagamentos ⇒ vê "Repasses recebidos" com E2E e comprovante
- [ ] Consulta/SOS em que o psicólogo ficou sozinho ⇒ não entra no repasse
- [ ] Psicólogo → Perfil → Chave Pix → trocar ⇒ Admin vê a chave nova em Repasses
- [ ] Consulta concluída já sincronizada (ainda não paga) → Psicólogo → Histórico → Consulta interrompida ⇒ aceita; sai do pendente e a consulta do mês volta ao paciente
- [ ] Consulta já paga → Consulta interrompida ⇒ recusado: "já foi paga no repasse, fale com o suporte"
- [ ] Admin confirma com valor desatualizado (outra aba sincronizou antes) ⇒ "O valor pendente mudou"; nada é pago
- [ ] Admin → Confirmar → conferir no banco ⇒ itens do psicólogo com paid_at e o registro com o E2E

## 8. Empresas / B2B (ficha 10)

- [ ] Admin → Empresas → criar "Teste" (Premium, 2 vagas, domínio `empresa.com`) ⇒ gera código
- [ ] Visitante → Cadastro com código + `ana@empresa.com` ⇒ entra Premium
- [ ] Visitante → Cadastro com código + `joao@gmail.com` ⇒ recusa pelo domínio
- [ ] Terceira pessoa com o código (2 vagas ocupadas) ⇒ "As vagas acabaram"
- [ ] RH → Portal da empresa → desligar colaborador ⇒ vaga volta; plano vale até o fim do mês
- [ ] Colaborador desligado pelo RH → usar o mesmo código de novo ⇒ "Seu acesso ao benefício desta empresa foi encerrado pelo RH"
- [ ] Colaborador → Sair do benefício → usar o código de novo ⇒ volta a ter o plano
- [ ] Admin → Empresas → pausar contrato ⇒ colaboradores perdem o plano
- [ ] 21 códigos errados seguidos ⇒ "Muitas tentativas de código"
- [ ] Paciente já cadastrado → Perfil → Benefício da empresa → digitar código ⇒ vira Premium
- [ ] Paciente → Benefício da empresa → Sair do benefício ⇒ perde o plano da empresa na hora e libera a vaga

## 9. Meus hábitos (ficha 11)

- [ ] Paciente → Home → Meus hábitos → Água → tocar copo ⇒ anel avança; Desfazer volta
- [ ] Paciente → Hábitos → Parar de fumar (início há 3 dias) ⇒ "3 dias", dinheiro economizado
- [ ] Parar de fumar → Senti vontade ⇒ registra e oferece respiração
- [ ] Parar de fumar → Recaída ⇒ contagem recomeça, recorde mantido
- [ ] Remédio com horário daqui a 20 min (push ativo) ⇒ lembrete chega; marcar dose ⇒ não repete
- [ ] Cafeína acima de 400 mg ⇒ anel vermelho e aviso
- [ ] Criar um hábito de cada tipo (sono, movimento, refeições, telas, algo que me faz bem) ⇒ cada um registra
- [ ] Hábito → Editar → mudar meta ⇒ salva; Excluir ⇒ some da lista
- [ ] Água sem internet → tocar 2 copos ⇒ "Sem internet agora", o anel avança; religar ⇒ os 2 copos chegam uma vez cada
- [ ] Água sem internet → tocar copo → recarregar a página ⇒ o copo continua lá e é enviado quando a internet volta
- [ ] Água → tocar copo e "Desfazer" na hora ⇒ o copo não volta depois
- [ ] Abrir o endereço /habitos/novo/water com Água já na lista ⇒ "Esse hábito já está na sua lista"
- [ ] Hábito → Tirar da minha lista → Apagar com o histórico ⇒ pede confirmação e apaga tudo
- [ ] Parar de fumar → Recaída tocando duas vezes rápido ⇒ conta uma recaída só
- [ ] Sono anotado de manhã ⇒ não chega "Como você dormiu?" no horário do lembrete
- [ ] Lembrete do remédio na tela bloqueada ⇒ "Hora do remédio (08:00)", sem o nome do remédio
- [ ] Lembrete de "Parar de fumar" na tela bloqueada ⇒ "3 dias seguidos", sem dizer do que
- [ ] App aberto de um dia para o outro ⇒ depois da meia-noite a água volta a zero sem recarregar

## 10. Meu progresso (ficha 12)

- [ ] Paciente → Home → registrar humor ⇒ aparece em Progresso
- [ ] Abrir o app dois dias seguidos ⇒ sequência = 2
- [ ] Progresso → Metas → "Respiração 5x" → fazer respiração ⇒ barra sobe 1
- [ ] Humor diário → registrar duas vezes no mesmo dia ⇒ a meta sobe 1 só; a média conta o último valor
- [ ] Às 22h → Meu progresso ⇒ as metas da semana continuam aparecendo
- [ ] Domingo → escolher um desafio → fazer o passo → abrir na segunda ⇒ o passo continua feito
- [ ] Semana nova (domingo) ⇒ as metas escolhidas voltam zeradas, sem escolher de novo
- [ ] Escolher metas tocando duas vezes em Salvar ⇒ cada meta aparece uma vez só
- [ ] Primeira respiração concluída ⇒ conquista "Primeiro Passo" com aviso
- [ ] Progresso → Histórico completo ⇒ respiração, humor e hábitos do dia
- [ ] Progresso → Metas da semana → escolher um desafio de 7 dias → "Fiz o passo de hoje" ⇒ avança 1 passo
- [ ] Progresso → Seus padrões (após alguns dias de registros) ⇒ mostra o que anda junto com os dias melhores
- [ ] Progresso → Conquistas ⇒ lista com progresso de cada conquista

## 11. Questionários (ficha 13)

- [ ] Paciente → Progresso → Questionários → GAD-7 tudo 0 ⇒ "Mínimos"
- [ ] Questionários → PHQ-9 tudo 2 ⇒ 18, "Moderadamente graves", sugere consulta
- [ ] PHQ-9 com pergunta 9 = 1 ⇒ apoio imediato com CVV e SOS
- [ ] Ligar "mostrar aos meus psicólogos" ⇒ psicólogo com consulta vê o resultado
- [ ] PHQ-9 → marcar a pergunta 9 acima de "Nenhuma vez" ⇒ o apoio (CVV e SOS) aparece na hora, antes de enviar
- [ ] PHQ-9 sem internet → enviar ⇒ "Tentar de novo", respostas e apoio continuam na tela
- [ ] Responder metade → sair da tela → voltar ⇒ as respostas continuam marcadas
- [ ] Compartilhamento ligado → responder de novo no mês seguinte ⇒ o novo resultado também aparece para o psicólogo
- [ ] Psicólogo que só recusou um pedido de consulta ⇒ não vê os resultados compartilhados
- [ ] Questionários → Apagar meus resultados deste questionário ⇒ pede confirmação e apaga tudo

## 12. Plano de segurança (ficha 14)

- [ ] Paciente → Home → Plano de segurança → criar (2 razões, 1 contato) → Ver → Ligar ⇒ abre discador
- [ ] Criar segundo plano ⇒ os dois na lista
- [ ] SOS em andamento → Psicólogo → painel do paciente → Plano de segurança ⇒ vê o plano
- [ ] SOS encerrado → Psicólogo tenta abrir o plano ⇒ não consegue
- [ ] Abrir um plano → desligar a internet → abrir de novo ⇒ mostra o plano com "Sem internet"; "Ligar" funciona
- [ ] SOS sem internet e sem nunca ter aberto o plano ⇒ "Sem internet para abrir o seu plano agora" e CVV
- [ ] Editor → escrever → sair sem salvar → voltar ⇒ o que foi escrito volta
- [ ] Editor com alteração → fechar a aba ⇒ o navegador pergunta antes de sair
- [ ] Mesmo plano em dois aparelhos → salvar num, depois no outro ⇒ "O plano mudou em outro aparelho", nada apagado
- [ ] Sair da conta ⇒ o plano deixa de abrir sem internet naquele aparelho

## 13. Autocuidado (ficha 15)

- [ ] Paciente → Home → Respiração 4-7-8 até o fim ⇒ conclusão; tempo sobe em Progresso
- [ ] Paciente → Sons → tocar um de cada categoria ⇒ áudio toca
- [ ] Sons → terminar um som ⇒ "Como você se sente?"
- [ ] Sons → tocar uma playlist ⇒ passa para o próximo som sozinho
- [ ] Paciente → Comer com atenção → até o fim ⇒ tela de conclusão
- [ ] Paciente → Diário → 2 anotações → 3ª no mesmo dia ⇒ recusa, texto fica na janela
- [ ] Psicólogo ⇒ não tem acesso ao diário do paciente
- [ ] Respiração de 5 min com o celular bloqueado ⇒ ao desbloquear depois de 5 min, já está concluída (não atrasa)
- [ ] Respiração ⇒ a tela não apaga sozinha durante a prática
- [ ] Respiração → "Terminar agora" depois de 2 min ⇒ conclusão com 2 minutos, que somam em Progresso
- [ ] Sons → "Dormir" 15 min → bloquear o celular ⇒ o som para sozinho em 15 min
- [ ] Sons → sair depois de 3 min ⇒ "Como você se sente?" e 3 min em Progresso
- [ ] Sons → "Como você se sente?" → voltar e avançar ⇒ o tempo não soma de novo
- [ ] Diário → escrever → fechar sem salvar → abrir de novo ⇒ o texto volta

## 14. Grupos de apoio (ficha 16)

- [ ] Paciente A → Grupos → grupo → depoimento anônimo ⇒ Paciente B vê "Anônimo"
- [ ] Paciente B → "Me ajudou" ⇒ contador sobe; de novo não duplica
- [ ] Paciente B → trocar para "Não me ajudou" ⇒ contadores trocam (e mantêm ao recarregar)
- [ ] Paciente B → Denunciar ⇒ Admin → Moderação → Grupos de apoio mostra a denúncia
- [ ] Admin → Grupos de apoio → editar / excluir ⇒ todos veem a mudança
- [ ] Paciente A → 6 depoimentos seguidos ⇒ o 6º é recusado
- [ ] Paciente → Grupos → favoritar ⇒ grupo vai para o topo
- [ ] Paciente B → tocar "Me ajudou" várias vezes bem rápido ⇒ sem erro e sem aviso a cada toque; ao recarregar, contador bate com o botão
- [ ] Paciente sem Plus/Premium → escrever ou reagir ⇒ bloqueado (também no servidor)
- [ ] Paciente A → escrever "penso em me matar" ⇒ quadro com "Ligar 188" e "Abrir o SOS"; publicar continua possível
- [ ] Paciente A → salvar depoimento com a internet caindo e tentar de novo ⇒ aparece uma vez só
- [ ] 3 pacientes → denunciar o mesmo depoimento ⇒ some para os outros; autor vê "Em análise"; admin descarta ⇒ volta

## 15. Suporte (ficha 17)

- [ ] Paciente → Perfil → Suporte → e-mail `abc` ⇒ recusa
- [ ] Suporte → descrição com `<a href="http://x.com">clique</a>` ⇒ e-mail mostra texto, sem link
- [ ] Suporte → enviar 4 vezes seguidas ⇒ a 4ª é recusada
- [ ] Psicólogo → Perfil → Suporte → enviar ⇒ e-mail chega

## 16. Privacidade e LGPD (ficha 18)

- [ ] Visitante → `/termos` e `/privacidade` ⇒ abrem sem login
- [ ] Paciente → Perfil → Configurações da conta → Baixar meus dados ⇒ JSON só com dados dele
- [ ] Paciente → Configurações → Excluir conta → senha errada ⇒ recusa
- [ ] Paciente (assinatura de teste) → Excluir conta → senha certa + EXCLUIR ⇒ sai; assinatura cancelada no Stripe
- [ ] Psicólogo → Excluir conta ⇒ orientado a falar com o suporte

## 17. Painel do admin (ficha 19)

- [ ] Admin → Login ⇒ vai direto ao painel
- [ ] Admin → Visão geral ⇒ números carregam; "Psicólogos pendentes" leva à seção
- [ ] Admin → Pessoas → Psicólogos → aprovar ⇒ psicólogo entra; aparece em Auditoria
- [ ] Admin → Pessoas → Pacientes → bloquear 1 dia ⇒ paciente vê o motivo; Auditoria registra
- [ ] Admin → Pacientes → desbloquear ⇒ paciente entra normalmente
- [ ] Admin → Moderação → Chat ⇒ números e participantes, nenhum texto de mensagem
- [ ] Admin → Atendimento → SOS ⇒ métricas carregam
- [ ] Admin → recarregar numa seção ⇒ continua na mesma seção
- [ ] Admin → Psicólogos → abrir documentos de um pendente ⇒ documentos abrem
- [ ] Admin → Psicólogos → Pendentes ⇒ sem menu de ações na linha; detalhe só com Aprovar e Rejeitar
- [ ] Admin → Psicólogos / Pacientes → menu de ações → Bloquear → fechar sem escolher ⇒ a página continua respondendo aos cliques
- [ ] Admin → menu de ações → Excluir → Cancelar ⇒ a página continua respondendo aos cliques
- [ ] Admin → Psicólogos → Exportar CSV ⇒ baixa a planilha da aba atual
- [ ] Admin → Psicólogos → Rejeitar com motivo ⇒ psicólogo vê o motivo ao entrar
- [ ] Admin → Psicólogos → bloquear / editar ⇒ mudanças valem na hora; Auditoria registra
- [ ] Admin → Pacientes → Editar paciente → salvar ⇒ dados atualizados
- [ ] Admin → Pacientes / Psicólogos → excluir conta de teste ⇒ some e não entra mais
- [ ] Admin → Auditoria ⇒ ações de aprovação, bloqueio e edição listadas
- [ ] Admin → Notificações ⇒ avisos do admin listados
- [ ] Admin → sino (celular e computador) ⇒ abre Notificações dentro do painel, sem voltar para a Visão geral
- [ ] Admin no celular ⇒ barra inferior com Início, Psicólogos, Pacientes, Repasses e Mais; a aba aberta fica destacada
- [ ] Admin no celular → Mais ⇒ abre todas as seções (Empresas, SOS, Chat, Grupos, Auditoria, Meu perfil, Sair)
- [ ] Admin → Psicólogos com cadastro pendente ⇒ número aparece na aba Psicólogos da barra e do menu
- [ ] Admin → Meu perfil → Trocar senha com a senha atual errada ⇒ recusado; com a certa ⇒ "Senha atualizada"
- [ ] Paciente, psicólogo e admin com a tela a partir de 768 px ⇒ menu lateral no lugar da barra inferior
- [ ] Computador → rolar qualquer tela (paciente, psicólogo, admin) ⇒ cabeçalho com "soliv" e o sino fica fixo no topo
- [ ] Janela com rolagem (ex.: Agenda semanal) → rolar ⇒ título e X de fechar fixos em cima; botão de confirmar fixo embaixo
- [ ] Admin no computador ⇒ menu lateral fixo; cada seção com título e descrição no topo, sem título repetido

## 18. Segurança (ficha 20)

- [ ] Abrir o app dentro de um `<iframe>` de outro site ⇒ "o Soliv não abre dentro de outros sites"
- [ ] Paciente → Chat → enviar arquivo `.html` ou foto de 20 MB ⇒ recusado
- [ ] Ações repetidas em sequência (SOS, agendar, curtir) ⇒ "Muitas ações em pouco tempo"
- [ ] Supabase → SQL Editor → conferência rápida da ficha 20 ⇒ tudo `true`
- [ ] SOS em andamento → paciente dá F5 ⇒ os dois voltam a se ver em poucos segundos; idem com o psicólogo
- [ ] SOS em andamento → paciente troca do Wi-Fi para o 4G ⇒ "Tentando reconectar" e volta sozinho
- [ ] SOS com a rede de um lado bloqueando vídeo (ou sem TURN numa rede corporativa) ⇒ depois de 45 s, "A chamada não está conectando"; paciente "Chamar outro psicólogo" ⇒ volta para a fila e o SOS do mês não é gasto
- [ ] Mesmo caso → psicólogo "Encerrar por falha de conexão" ⇒ SOS do mês volta para o paciente
- [ ] SOS → psicólogo entra e encerra sem o paciente ter aparecido no vídeo ⇒ SOS do mês volta; não entra no repasse
- [ ] SOS com queda longa no meio (cronômetro pausado) ⇒ a chamada não é cortada pelo servidor enquanto ainda há tempo na tela
- [ ] Chamada (SOS e consulta) → desligar e religar a câmera ⇒ a miniatura "Você" volta a mostrar o vídeo na hora
- [ ] Chamada → o outro lado muta ⇒ ícone vermelho de microfone ao lado do nome dele (e barras quando fala)
- [ ] Psicólogo → Contexto do paciente ⇒ a tela divide (contexto à esquerda, vídeo à direita; no celular, embaixo) e fecha pelo X
- [ ] SOS ⇒ cronômetro começa em 25:00 (qualquer plano); consulta ⇒ 50:00
- [ ] Chamada ⇒ sem botão de diagnóstico; Ctrl+D muta e Ctrl+E desliga a câmera
- [ ] Consulta → os dois conversam 2 min, a internet de um cai e ninguém volta ⇒ 30 min após o fim: "Consulta interrompida" para os dois, consulta do mês devolvida, fora do repasse
- [ ] Consulta → os dois conversam 10 min e encerram ⇒ "Consulta finalizada"; entra no repasse
- [ ] Consulta → psicólogo tenta "Concluir" uma chamada de 2 min ⇒ recusado com orientação para marcar como interrompida
- [ ] Consulta com os dois na sala e sem áudio/vídeo por 45 s ⇒ "A chamada não está conectando"; psicólogo "Marcar como interrompida" ⇒ paciente avisado e consulta do mês devolvida, sem erro ao sair da sala
- [ ] Consulta → mutar/desligar a câmera ⇒ fica gravado na sala (`patient_muted`/`psychologist_camera_off`)
- [ ] Psicólogo novo → cadastrar → sair e entrar de novo ⇒ continua em "cadastro em análise" (não entra no painel)
- [ ] Consulta → psicólogo entra na sala sozinho e encerra ⇒ a consulta não vira "realizada"; com o paciente na chamada, vira

## 19. Rotinas automáticas (ficha 21)

- [ ] Supabase → SQL Editor → conferência da ficha 21 ⇒ todas as rotinas com execução recente sem erro
- [ ] Pedido de consulta sem resposta por 24 h ⇒ expira e a consulta do mês volta
- [ ] SOS concluído ⇒ ~24 h depois chega "Como você está hoje?"
