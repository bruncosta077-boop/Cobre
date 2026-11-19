# Cobre Desktop

Código-fonte do Cobre Desktop 3.2.1 para Windows.

O Cobre é um player de música local feito com Electron. Ele organiza arquivos de áudio por metadados e oferece reprodução, playlists, histórico, letras, capas e controles de áudio.

O Cobre ID pode ser aberto em Configurações → Conta Cobre ou pelo menu da bandeja do Windows. Quando não há conta conectada, o app também apresenta a tela de conta ao iniciar. Para entrar ou criar uma conta, configure um servidor Cobre ID ativo na opção **Avançado** da janela. Sem login, a biblioteca local continua disponível.

## Executar para desenvolvimento

Requer Node.js e npm instalados no Windows.

```powershell
npm install
npm start
```

## Gerar os pacotes do Windows

```powershell
npm run dist
```

O comando gera um instalador assistido do Windows e um ZIP portátil de 64 bits dentro de `release/`. Para usar o ZIP, extraia-o e abra o executável Cobre.

O executável não é assinado digitalmente. O Windows pode exibir um aviso de segurança ao abrir o instalador ou o app.

## Estado deste repositório

Este snapshot contém o código-fonte da aplicação. Não há suíte de testes automatizados. A geração do instalador verifica o empacotamento, mas não substitui a verificação manual da reprodução e dos demais recursos no Windows.

## Privacidade

Não envie bibliotecas, credenciais ou dados pessoais do usuário. Arquivos de configuração e dados de execução locais estão listados no `.gitignore`.
