# Histórico de versões — Cobre Desktop

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
