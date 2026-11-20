# Histórico de versões — Cobre Desktop

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
