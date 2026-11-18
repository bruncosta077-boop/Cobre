# Cobre Desktop

Código-fonte do Cobre Desktop 3.2.0 para Windows.

O Cobre é um player de música local feito com Electron. Ele organiza arquivos de áudio por metadados e oferece reprodução, playlists, histórico, letras, capas e controles de áudio.

## Estado deste repositório

Este primeiro snapshot foi extraído do pacote completo do Cobre Desktop 3.2.0. Ele contém os arquivos da aplicação, sem o runtime Electron empacotado e sem `node_modules`.

O pacote atual declara `music-metadata`, mas ainda não inclui uma dependência Electron, comandos de desenvolvimento/build ou testes automatizados. Portanto, este snapshot registra o código-fonte; a configuração para desenvolvimento e geração do instalador precisa ser documentada e organizada em uma etapa própria.

## Privacidade

Não envie bibliotecas, credenciais ou dados pessoais do usuário. Arquivos de configuração e dados de execução locais estão listados no `.gitignore`.