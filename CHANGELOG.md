# Histórico de versões — Cobre Desktop

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
