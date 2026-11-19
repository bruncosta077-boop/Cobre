# Histórico de versões — Cobre Desktop

## 3.6.0 — em validação

- Atualizado `music-metadata` para 12.7.0, corrigindo avisos de segurança no processamento de arquivos ASF, ID3, APE e EBML.
- Atualizado `electron-builder` para 26.18.1 e aplicado override seguro de `minimatch` 11.0.9.
- Janela “Sobre” agora cita as contribuições de [@dilucas00](https://github.com/dilucas00).
- Versão enviada ao Cobre ID é lida do próprio `package.json` para evitar divergência.
- Auditoria local do npm: zero vulnerabilidades conhecidas. Ainda precisa de validação funcional no app antes de publicar.

## 3.5.0 — 2026-11-19

- Interface reorganizada e refinamentos no mini player e nos controles.
- Busca e exibição de informações dos encartes aprimoradas.
- Atualização dentro do app disponível na edição portátil compatível, com notas e verificação SHA-256.
- Pacotes Windows x64: instalador, ZIP portátil e pacote de atualização.
- Tela “Sobre” identifica Bruno C S Moraes, as contribuições de @dilucas00 e a assistência do Claude.
- Créditos: Bruno C S Moraes, com contribuição de [@dilucas00](https://github.com/dilucas00).

### Compatibilidade

A atualização interna atende a edição portátil compatível e não altera instalações que executam o app dentro de `app.asar`. O executável não está assinado digitalmente pelo Windows.

## Histórico anterior

Versões anteriores e downloads: [releases do Cobre Desktop](https://github.com/bruncosta077-boop/Cobre/releases).
