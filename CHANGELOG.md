# Histórico de versões — Cobre Desktop

## 3.18.0 — conexão pela VPN Tailscale

- A janela Acesso remoto mostra o endereço Tailscale do Desktop junto ao endereço local, quando a VPN está ativa.
- A interface explica o uso do endereço VPN no Mobile e a aprovação pelo Cobre ID.
- O cliente Cobre ID aceita HTTP na rede local/VPN e HTTPS público; bloqueia HTTP em domínio público para proteger credenciais e tokens.
- Biblioteca e áudio seguem diretamente do Desktop ao Mobile pelo túnel Tailscale, sem relay nem porta aberta no roteador.
- Testes cobrem descoberta do endereço Tailscale e validação segura do endereço do Server.

## 3.17.1 — atualização dentro do app instala de verdade

- A atualização dentro do app baixava e verificava a versão nova, fechava o Cobre e não instalava nada. O instalador era lançado como um PowerShell sem console, e nesse modo o Windows PowerShell termina na hora, sem erro e sem executar o script. Isso valia para todas as versões anteriores.
- O instalador agora é aberto num console próprio, oculto, que continua rodando depois que o Cobre fecha.
- O Cobre só fecha depois que o instalador confirma que começou. Se ele não começar, aparece um aviso e o Cobre continua aberto.
- Antes de trocar os arquivos, o instalador espera todos os processos do Cobre terminarem e tenta a cópia de novo se o arquivo ainda estiver em uso.
- As notas mostradas depois da atualização ("O que mudou") não perdem mais os acentos.
- Um teste novo confirma que o instalador continua rodando depois que o processo que o abriu termina.
- **Instale esta versão uma vez pelo instalador ou pelo ZIP portátil.** As versões anteriores não conseguem concluir a atualização sozinhas; a partir da 3.17.1, as próximas chegam pelo app.
- Inclui contribuição de [@dilucas00](https://github.com/dilucas00).

## 3.17.0 — Preferências redesenhadas, cor da capa e cinema no tema claro

- Preferências com cara nova: lateral com ícones, título e frase de apoio em cada categoria e opções agrupadas em cartões. Em janelas estreitas, a lateral vira uma faixa de ícones.
- Aparência: o tema é escolhido por cartões com a miniatura do app (Escuro, Claro, Seguir o Windows), e Visualização da capa e Barra de tempo viraram blocos com desenho.
- Manutenção, Backup e Conta e conexões mostram cada ação como uma linha com ícone, título e descrição.
- Letras ganhou uma prévia que muda junto com o estilo e o tamanho escolhidos.
- As setas do teclado andam pelas categorias e pelas opções.
- Cor de destaque: a opção dinâmica agora se chama "Da capa" e mostra a capa atual. Sem música tocando, ela usa o cobre e avisa o que fazer, em vez de não mudar nada. Capas que o Windows não consegue ler, como WebP, também funcionam.
- Nova opção "Personalizada": escolha qualquer cor de destaque, e o segundo tom é gerado a partir dela.
- O modo cinema passa a seguir o tema: no claro, fundo papel e barra de vidro clara. O encarte, a análise de espectro e a capa ampliada continuam escuros.
- Os arquivos da interface não ficam mais em cache, para uma atualização nunca exibir estilos ou scripts antigos.
- Inclui contribuição de [@dilucas00](https://github.com/dilucas00).

## 3.16.0 — atualização automática restaurada e capa quadrada

- A atualização dentro do app voltou a funcionar. O pacote publicado nas versões 3.14.0 e 3.15.0 tinha caminhos inválidos no manifesto (por exemplo `12/node_modules/...`), gerados porque o script de empacotamento cortava os caminhos pelo tamanho da pasta temporária, que no GitHub Actions aparece em formato curto do Windows. O app recusava o pacote com "O pacote lista arquivos inválidos". Os caminhos agora são montados pelos nomes das pastas.
- O pacote `Cobre-Update-v…-x64.zip` passa a conter só o `app.asar`, único arquivo trocado em instalações pelo instalador ou pelo ZIP portátil. Como esse arquivo é aceito pelo atualizador de todas as versões desde a 3.6, instalações antigas (3.6 a 3.15) conseguem atualizar direto para esta versão, sem reinstalar. Antes, cada arquivo novo do app fazia as versões anteriores recusarem o pacote inteiro.
- Instalações descompactadas (sem `app.asar`) usam o novo pacote `Cobre-Update-Full-v…-x64.zip` a partir desta versão.
- Os testes do CI agora aplicam ao pacote gerado a mesma validação de manifesto que o app faz depois do download, impedindo a publicação de um pacote que o app recusaria.
- Na tela Tocando agora, a capa do álbum aparece quadrada, mostrando a arte inteira em vez de cortá-la num círculo.
- Na barra do player, o botão de saída de áudio (fone) fica depois do botão de som e equalizador, ao lado do volume.
- Inclui contribuição de [@dilucas00](https://github.com/dilucas00).

## 3.15.0 — recuperação quando uma faixa não pode ser lida

- Se o Chromium não conseguir abrir ou decodificar uma faixa, o player informa qual faixa falhou e tenta a próxima faixa da fila.
- Faixas que falharam são lembradas durante aquela reprodução para não criar um ciclo infinito quando a repetição está ligada. Se nenhuma faixa restante tocar, o app mostra uma mensagem para verificar o arquivo ou formato.
- A versão mantém a instalação e atualização existentes. A versão exibida pela interface continua sendo obtida do executável Electron.

## 3.14.0 — atualização confiável e manutenção do player

- O tempo total, a barra de busca e a transição entre faixas usam a duração lida dos metadados do arquivo quando o elemento de áudio do Chromium ainda não informa uma duração finita. Isso evita mostrar `0:00` durante a reprodução e mantém a navegação da faixa disponível.
- O app verifica atualizações automaticamente ao abrir, no máximo uma vez a cada 24 horas; quando encontra uma versão nova, mostra as notas e pede confirmação antes de baixar ou instalar.
- Se a API REST do GitHub retornar 403/429 por limite de consultas, o atualizador consulta o feed público de releases e valida o arquivo pelo checksum SHA-256 publicado.
- Antes de baixar, o atualizador verifica se o usuário pode gravar na pasta do aplicativo e explica como corrigir uma instalação em pasta protegida. A atualização mantém backup e recuperação existentes.
- Corrigida a lista segura do extrator para reconhecer `layout.js` e `theme.js`; as listas de validação JavaScript e extração PowerShell agora são comparadas por teste, evitando que uma versão aprovada pelo manifesto falhe ao ser extraída.
- Atualizado Electron de 45.3.4 para 45.4.1, incorporando correções da série estável mais recente na data desta versão.
- `npm test`: 21 testes passaram, incluindo a extração do ZIP incremental 3.14.0 pelo extrator real do app; `npm audit --audit-level=moderate`: zero vulnerabilidades.
- Publicada em [Cobre Desktop 3.14.0](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.14.0); [CI de publicação concluído](https://github.com/bruncosta077-boop/Cobre/actions/runs/45065209437). A release inclui instalador, ZIP portátil, pacote de atualização e checksums SHA-256.

## 3.13.0 — descoberta local para Mobile e TV

- Com o acesso remoto ativo e o Cobre ID conectado, o Desktop anuncia seu identificador e as versões de protocolo por mDNS na rede local.
- O anúncio não inclui endereço de acesso, token, chave LAN, conta ou senha. Mobile/TV ainda pedem uma concessão pelo Cobre Server e o Desktop precisa aprovar o aparelho.
- O anúncio é removido ao desligar o acesso remoto, sair da conta ou encerrar o aplicativo; falhas do mDNS não interrompem o servidor LAN existente.
- O Server continua coordenando conta e autorização; o áudio segue diretamente do Desktop para o cliente.
- `npm test` passou (13 testes), `npm audit` reportou zero vulnerabilidades e o GitHub Actions compilou/publicou os quatro artefatos no [run 44946779616](https://github.com/bruncosta077-boop/Cobre/actions/runs/44946779616).
- Instalador, ZIP portátil, atualizador interno e checksums estão em [Cobre Desktop 3.13.0](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.13.0). O build local confirmou os mesmos nomes de pacote; binários de lançamento são reconstruídos no CI e não têm assinatura digital de código.

## 3.12.2 — versão exibida pelo próprio aplicativo

- A tela Sobre, o rodapé das configurações e o diagnóstico agora consultam a versão real do executável Electron, eliminando divergência entre o programa instalado e o número mostrado na interface.

## 3.12.1 — correção do atualizador interno

- Corrigida a extração segura do pacote de atualização para aceitar os arquivos de fonte e estilos locais introduzidos na interface 3.11.
- O pacote continua limitado aos caminhos explicitamente permitidos e valida o manifesto antes de instalar.
- Usuários na versão 3.12.0 devem instalar esta versão pelo instalador/ZIP uma vez; as próximas atualizações internas passam a funcionar normalmente.

## 3.12.0 — diagnóstico de acesso remoto

- Corrigido o erro que mascarava falhas de autorização do Cobre ID como HTTP 503 genérico.
- Permissões expiradas ou revogadas agora retornam HTTP 401; escopos insuficientes retornam HTTP 403; falhas reais de comunicação com o Cobre ID permanecem HTTP 503 com códigos específicos.
- A resposta continua sem expor tokens, credenciais ou mensagens internas.
- Inclui cobertura automatizada para autorização expirada, revogada, sem escopo e servidor indisponível.
- Esta correção permite ao Cobre Mobile indicar a ação adequada e solicitar novo pareamento por QR quando necessário.

## 3.11.0 — nova experiência visual

- Repaginada a interface com a identidade visual Cobre, navegação lateral e controles de reprodução reunidos numa barra inferior.
- Criada a tela “Tocando agora”, usada também nos modos de tela cheia e cinema.
- Preferências organizadas por categorias; controles de áudio reunidos no painel Som, com curva visual do equalizador.
- Adicionada opção de tema claro, além dos temas escuro e conforme o Windows.
- Fonte e estilos incluídos localmente para manter a mesma aparência sem depender de recursos externos.
- Reformuladas as janelas da Conta Cobre, mini player e controle remoto; os pedidos para permitir ou recusar acesso ao Desktop continuam disponíveis na tela da conta.
- Corrigido o pacote de atualização interno para incluir e aceitar o novo layout, estilos e fontes.
- Inclui contribuição de [@dilucas00](https://github.com/dilucas00).

## 3.10.0 — pareamento seguro por QR

- O painel Acesso remoto gera um QR curto com endereço local e identidade do Desktop, sem incluir senha, chave compartilhada ou token.
- O Cobre Mobile lê o QR, solicita acesso pelo Cobre ID e guarda o endereço local somente depois da aprovação explícita no Desktop.
- A biblioteca, as capas, o estado do player, os comandos e o áudio continuam usando as rotas autenticadas por cabeçalho `Authorization`; o Cobre Server não retransmite as músicas.
- Ler o QR descobre o endereço local automaticamente; o QR expira em cinco minutos e pode ser renovado na tela. O endereço manual continua como alternativa se o scanner não estiver disponível.
- O fluxo antigo de chave LAN permanece por compatibilidade com clientes anteriores; ele não é usado pelo novo pareamento Cobre ID.
- Inclui [@dilucas00](https://github.com/dilucas00).

## 3.9.0 — base de acesso Cobre ID por aparelho

- Conta Cobre mostra solicitações recebidas de Mobile/TV e permite aprovar ou recusar cada aparelho.
- Presença do Desktop informa quando o host de acesso remoto está ativo.
- Acrescentadas rotas locais protegidas por concessões Cobre ID: biblioteca, capas, áudio com `Range`, estado do player e comandos de reprodução/volume/busca.
- O Desktop valida a concessão no Cobre Server e guarda a validação positiva por até 5 segundos; indisponibilidade do serviço falha fechada para as rotas protegidas.
- O contrato novo não remove ainda as rotas antigas de chave compartilhada. O Mobile precisa migrar para o contrato protegido antes de desativar o caminho legado.
- Atualizador interno e pacote incremental incluem o novo módulo de autorização.
- A validação local e o build de distribuição ainda estão em andamento; não é release publicada.

## 3.8.0 — transmissão local mais robusta

- O acesso remoto agora trata corretamente faixas de bytes, incluindo pedidos parciais, sufixos, intervalos abertos e posições inválidas. Isso melhora seek e retomada ao transmitir áudio para o Mobile.
- Adicionado suporte a `HEAD`, respostas HTTP `416` para intervalos inválidos e encerramento correto do fluxo quando a conexão cai.
- Mantidos os controles de segurança existentes: endereço local com chave, HTTP privado e sem redirecionar a chave para outro host.
- Corrigido o pacote de atualização interno para incluir o novo módulo de faixa de bytes.
- Inclui [@dilucas00](https://github.com/dilucas00).

## 3.7.0 — preferências recuperáveis

- Corrige a migração das configurações salvas antes da troca para o protocolo seguro `cobre://app`.
- Guarda uma cópia local automática das preferências no perfil do usuário e restaura chaves ausentes ao iniciar.
- Adiciona exportação/importação manual de configurações; o arquivo não inclui senha nem token Cobre ID.
- A conta continua armazenada separadamente, criptografada pelo Windows; playlists, biblioteca e dados locais permanecem no perfil do usuário durante atualizações normais.
- Inclui [@dilucas00](https://github.com/dilucas00).

## 3.6.0 — 2026-11-20

- Atualizado `music-metadata` para 12.7.0, corrigindo avisos de segurança no processamento de arquivos ASF, ID3, APE e EBML.
- Atualizado `electron-builder` para 26.18.1 e aplicado override seguro de `minimatch` 11.0.9.
- Janela “Sobre” agora cita as contribuições de [@dilucas00](https://github.com/dilucas00).
- Versão enviada ao Cobre ID é lida do próprio `package.json` para evitar divergência.
- `webSecurity` permanece ativo nas janelas principal, mini player e Cobre ID; arquivos locais são servidos por protocolo `cobre://` com lista explícita, CSP, navegação e popups bloqueados.
- Atualizador interno agora troca o `app.asar` em instalações empacotadas e atualiza os arquivos e dependências de produção em instalações portáteis descompactadas. Confere SHA-256, manifesto e caminhos, cria backup e tenta restaurar em falha.
- A versão 3.5 não consegue aplicar este pacote com o próprio atualizador antigo; instale a 3.6 uma vez pelo instalador ou ZIP portátil. A partir da 3.6, a atualização interna está habilitada.
- `npm audit` não encontrou vulnerabilidades conhecidas; build Windows, pacote de atualização e inicialização do app foram verificados.

## 3.5.0 — 2026-11-19

- Interface reorganizada e refinamentos no mini player e nos controles.
- Busca e exibição de informações dos encartes aprimoradas.
- Atualização dentro do app disponível na edição portátil compatível, com notas e verificação SHA-256.
- Pacotes Windows x64: instalador, ZIP portátil e pacote de atualização.
- Tela “Sobre” identifica Bruno C S Moraes, as contribuições de @dilucas00 e a assistência do Claude.
- Créditos: Bruno C S Moraes, com contribuição de [@dilucas00](https://github.com/dilucas00).

### Compatibilidade

O atualizador da versão 3.5 não consegue substituir um `app.asar`; a versão 3.6 corrige isso para as próximas atualizações. A 3.6 também aceita instalações portáteis descompactadas. O executável não está assinado digitalmente pelo Windows.

## Histórico anterior

Versões anteriores e downloads: [releases do Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases).
