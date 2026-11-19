# Cobre Desktop

Player de música local para Windows. Este repositório contém **somente a versão Desktop** do Cobre.

## Versão

- Código-fonte: **3.5.0**.
- Última versão publicada: **3.5.0** (instalador, ZIP portátil e pacote de atualização interna).
- Windows x64; o app não possui assinatura digital.

## Código-fonte e execução

O código Electron está na raiz deste repositório. Requer Node.js e npm:

```powershell
npm install
npm start
```

Para gerar instalador e ZIP portátil:

```powershell
npm run dist
```

O build sai em `release/`. Para informações de integração entre os dispositivos, consulte [`docs/Cobre-Connect-v1.md`](docs/Cobre-Connect-v1.md).

## Atualização dentro do app

Na edição portátil descompactada, a opção **Configurações → Manutenção → Atualizar Cobre** consulta releases do GitHub. Para cada versão distribuída pelo atualizador, anexe `Cobre-Update-vX.Y.Z-x64.zip`, criado por `scripts/package-update.ps1`. As notas da release são mostradas depois da atualização. O atualizador verifica o SHA-256 publicado pela API do GitHub antes de instalar. Ele não atualiza uma instalação empacotada em `app.asar`.

## Separação dos produtos

- [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile) — cliente Android independente.
- [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server) — serviço de identidade e coordenação do ecossistema.

Os produtos ainda estão em estágios diferentes e **ainda não entregam streaming integrado entre Desktop, Mobile e TV**. A conta Cobre ID e a presença de dispositivos não significam que a biblioteca do PC já esteja disponível nos outros aparelhos.

## Estado do projeto

Este é o código-fonte do Desktop. A versão 3.5.0 está publicada com instalador, ZIP portátil e pacote de atualização interna. O atualizador interno atende à edição portátil e não atualiza instalações empacotadas em app.asar.

O projeto não declara uma licença de redistribuição. Consulte o autor antes de reutilizar ou redistribuir.
