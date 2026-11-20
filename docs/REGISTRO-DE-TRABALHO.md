# Registro de trabalho — Cobre Desktop

## 2026-11-20 — versão 3.6.0

- Ativado `webSecurity` na janela principal, no mini player e na conta Cobre ID. A interface local usa `cobre://app/` com lista explícita de páginas, CSP (`script-src 'self'`), bloqueio de navegação/popup e media local por identificadores temporários. Scripts inline do mini player e da conta foram movidos para arquivos locais.
- O updater aceita o formato empacotado (`app.asar`) e a pasta portátil descompactada. O ZIP reúne os dois formatos e dependências de produção; o atualizador escolhe somente os arquivos de destino da instalação atual.
- Baixa da release fixa do GitHub, valida domínio, tamanho e SHA-256 publicado, confere manifesto e caminhos antes da extração, mantém backup e restaura arquivos caso a cópia falhe. A tela existente exibe as notas da release depois da instalação.
- A versão 3.5.0 ainda não consegue aplicar este pacote: seu atualizador tem allowlist/manifesto antigos e a instalação ativa foi confirmada como Cobre 3.5.0 descompactado com `music-metadata` 7.14.0. A atualização inicial para 3.6.0 precisa ser feita pelo instalador ou ZIP portátil; a partir de 3.6.0, o mecanismo novo está disponível.
- `npm ci`, `npm audit --audit-level=moderate` (zero vulnerabilidades conhecidas) e `npm run dist` passaram localmente. `node --test` não encontrou testes automatizados neste repositório.
- Smoke test do executável empacotado: a janela principal abriu em `cobre://app/index.html`; um WAV temporário foi lido como faixa e entregue por `cobre://app/media/...` com HTTP 200, tipo `audio/wav` e 8.864 bytes; a janela Conta Cobre também abriu pelo protocolo.
- O instalador de atualização foi executado em diretórios temporários: instalação simulada escreveu a versão e preservou cópia anterior; falha induzida ao copiar um arquivo seguinte restaurou o `app.asar` antigo e gerou nota de falha.
- O pacote interno final local tem 1,18 MiB, manifesto de 446 arquivos, dependências de produção e `app.asar` igual ao build. SHA-256 local do EXE `2b541e389ff0530aec121eb42616919b8a3f445207d5142b785a40466c5f594b`; ZIP portátil `11bca2341f9f39b8fa94eea91d280b44b8a8c05d9a86eae443a56258697be4d`; pacote interno `c0357821fa261ddf1e54c31a806d9f163863e866ff8e0c89f35036d443a414d3`.
- Estes são hashes do build local; os artefatos da release oficial são reconstruídos pelo GitHub Actions. O EXE não possui assinatura digital. Streaming real de biblioteca e validação do fluxo de download/atualização contra uma release publicada continuam pendentes.


## Ajuste de build CI — 2026-11-20

- A primeira execução do workflow Desktop falhou porque o electron-builder detectou CI e tentou publicar diretamente sem GH_TOKEN. O pacote local havia passado, pois não está sob CI. A causa foi corrigida em package.json com --publish never; agora só a etapa explícita do GitHub Actions cria a release.
