<div align="center">
  <img src="docs/images/cobre-logo-dark.svg" alt="Logo do Cobre" width="240">
  <br>
  <img src="docs/images/cobre-desktop-biblioteca.jpg" alt="Captura do Cobre Desktop em sua biblioteca de música" width="100%">
  <h1>Cobre Desktop</h1>
  <p>Reprodutor de música local para Windows</p>
  <p><strong>Versão 3.6.0 em validação · Última versão pública: 3.5.0</strong></p>
</div>

Desenvolvimento principal: Bruno C S Moraes · Contribuição ao projeto: [@dilucas00](https://github.com/dilucas00).

## Downloads

Os pacotes públicos mais recentes (3.5.0) estão na [página de lançamento](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.5.0). A versão 3.6.0 está em validação e ainda não deve ser instalada como atualização pública.

- **Instalador:** `Cobre-3.5.0-x64.exe`
- **Versão portátil:** `Cobre-3.5.0-x64.zip`
- **Atualização dentro do app:** `Cobre-Update-v3.5.0-x64.zip` — para instalações portáteis compatíveis.

## Sobre o projeto

Este repositório contém somente o código-fonte do Cobre Desktop. O aplicativo usa Electron e toca a biblioteca de música local no Windows.

## Executar o código-fonte

Requer Node.js e npm:

```powershell
npm install
npm start
```

Para gerar o instalador e a versão portátil:

```powershell
npm run dist
```

Os pacotes são gerados na pasta `release/`.

## Atualização dentro do app

Na edição portátil descompactada, acesse **Configurações → Manutenção → Atualizar Cobre**. O app consulta as releases do GitHub, mostra as notas, baixa o pacote e verifica seu SHA-256 antes de aplicar a atualização. Esse mecanismo não atualiza instalações empacotadas em `app.asar`.

## Ecossistema Cobre

- [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile) — cliente Android independente, em protótipo.
- [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server) — serviço Cobre ID para contas, sessões, dispositivos e pareamento inicial.

O streaming integrado entre Desktop, Mobile e TV e a sincronização da biblioteca ainda não estão disponíveis. A presença de dispositivos e a conta Cobre ID, por si só, não dão acesso à música do computador em outros aparelhos.

## Licença

O projeto não declara uma licença de redistribuição. Consulte o autor antes de reutilizar ou redistribuir o código.
