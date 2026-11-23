<div align="center">
  <img src="docs/images/cobre-logo-dark.svg" alt="Logo do Cobre" width="240">
  <br>
  <img src="docs/images/cobre-desktop-biblioteca.jpg" alt="Captura do Cobre Desktop em sua biblioteca de música" width="100%">
  <h1>Cobre Desktop</h1>
  <p>Reprodutor de música local para Windows</p>
  <p><strong>Versão 3.16.0</strong></p>
</div>

Desenvolvimento principal: Bruno C S Moraes · Contribuição ao projeto: [@dilucas00](https://github.com/dilucas00).

## Downloads

Os pacotes públicos mais recentes estão na [página de lançamentos](https://github.com/bruncosta077-boop/Cobre/releases).

- **Instalador:** `Cobre-3.16.0-x64.exe`
- **Versão portátil:** `Cobre-3.16.0-x64.zip`
- **Atualização dentro do app:** `Cobre-Update-v3.16.0-x64.zip` contém só o `app.asar` e atualiza instalações feitas pelo instalador ou pelo ZIP portátil a partir da versão 3.6.0. `Cobre-Update-Full-v3.16.0-x64.zip` atende instalações descompactadas a partir da 3.16.0.

## Sobre o projeto

Este repositório contém somente o código-fonte do Cobre Desktop. O aplicativo usa Electron e toca a biblioteca de música local no Windows.

## Licença

O código do Cobre é proprietário e está disponível publicamente para inspeção. Consulte o [aviso de licença](LICENSE); componentes de terceiros mantêm suas próprias licenças.

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

Acesse **Configurações → Manutenção → Atualizar Cobre**. O app verifica atualizações ao abrir (no máximo uma vez por dia) e oferece as notas antes do download; também é possível consultar manualmente. Se a API do GitHub limitar as consultas, o app usa a lista pública de releases e valida o pacote pelo SHA-256. A instalação é conferida antes do download para avisar quando a pasta escolhida não permite gravação. O atualizador atualiza instalações empacotadas em `app.asar` ou portáteis descompactadas, com cópia de segurança e tentativa de recuperação em falha. Instalações 3.5.0 precisam atualizar para 3.6.0 uma vez pelo instalador ou ZIP portátil; depois disso o atualizador interno passa a funcionar. As preferências da 3.5 também são migradas para o armazenamento seguro da 3.7.

Em **Configurações → Backup das configurações**, exporte ou restaure preferências num arquivo JSON. O backup exclui senhas e tokens da conta. Atualizar por cima mantém os dados no perfil do Windows; desinstalar ou apagar os dados do usuário não é necessário para atualizações normais.

## Ecossistema Cobre

- [Cobre Mobile](https://github.com/bruncosta077-boop/Cobre-Mobile/releases/tag/mobile-v0.18.0) — versão 0.18.0 publicada; 0.19.0 está em preparação, com downloads offline e restauração da fila aguardando validação em aparelho.
- [Cobre Server](https://github.com/bruncosta077-boop/Cobre-Server/releases/tag/v1.3.0) — versão 1.3.0 estável, com contas, sessões, dispositivos, presença, pareamento Cobre ID e exclusão autenticada de conta.
- [Cobre TV](https://github.com/bruncosta077-boop/Cobre-TV) — protótipo 0.6.0 em desenvolvimento; ainda precisa de validação em Google TV/Android TV físico.

O Desktop transmite áudio diretamente ao Mobile e à TV na rede local após autorização; o Cobre Server não retransmite mídia. Sincronização de bibliotecas/playlists entre aparelhos não está disponível.

## Segurança do acesso remoto

No pareamento Cobre ID por QR, a credencial de acesso vai no cabeçalho da requisição e o QR contém apenas dados locais de descoberta. O Desktop transmite o áudio diretamente por HTTP na rede local; esse tráfego não é criptografado no Wi-Fi. O modo antigo de chave no endereço permanece para compatibilidade e deve ser tratado como senha. Não encaminhe a porta do Cobre à internet nem use redes públicas; para acesso fora de casa, use uma VPN privada confiável.
