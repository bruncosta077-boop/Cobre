<div align="center">
  <img src="cobre-desktop/icon.png" alt="Ícone do Cobre" width="112">
  <h1>Cobre</h1>
  <p>Reprodutor de música local para Windows e Android</p>
</div>

O Cobre é um projeto em desenvolvimento para ouvir e organizar músicas locais. Este repositório reúne duas versões independentes; elas ainda não têm os mesmos recursos nem sincronizam dados entre si.

## Baixar

### Cobre Desktop — Windows x64

- [Instalador do Windows (.exe)](https://github.com/bruncosta077-boop/Cobre/releases/download/cobre-desktop-v3.2.0/Cobre-3.2.0-x64.exe)
- [Versão portátil (.zip)](https://github.com/bruncosta077-boop/Cobre/releases/download/cobre-desktop-v3.2.0/Cobre-3.2.0-x64.zip)
- [Página da versão 3.2.0](https://github.com/bruncosta077-boop/Cobre/releases/tag/cobre-desktop-v3.2.0)

O ZIP portátil não precisa de instalação: extraia o arquivo e abra <code>Cobre.exe</code>. O app não tem assinatura digital, então o Windows pode exibir um aviso ao abrir.

### Cobre Mobile — Android

O Mobile ainda é um protótipo. O APK de depuração pode ser gerado pelo workflow [Build APK](https://github.com/bruncosta077-boop/Cobre/actions/workflows/build-apk.yml):

1. Abra o workflow e escolha **Run workflow**.
2. Quando a execução terminar, abra o resultado e baixe o artefato <code>cobre-mobile-debug-apk</code>.
3. Extraia o APK do ZIP do artefato para instalar no aparelho.

O APK é de depuração, e o projeto ainda precisa ser validado em um aparelho Android real.

## Estado das versões

| Versão | Plataforma | Situação |
| --- | --- | --- |
| Desktop 3.2.0 | Windows x64 | Instalador e ZIP disponíveis. O build foi empacotado, mas os recursos do player não foram validados funcionalmente nesta entrega. |
| Mobile 0.1.0 | Android 10 ou superior | Protótipo em desenvolvimento; veja o [status](cobre-mobile/STATUS.md) e o [roadmap](cobre-mobile/ROADMAP.md). |

## Código-fonte

- [Cobre Desktop](cobre-desktop/README.md) — código e instruções para gerar o instalador e o ZIP.
- [Cobre Mobile](cobre-mobile/) — projeto Android em Kotlin, Jetpack Compose e Media3.

Para compilar o Desktop no Windows, siga as instruções em [cobre-desktop/README.md](cobre-desktop/README.md). O Mobile usa Gradle; seu processo de geração do APK está descrito em [cobre-mobile/STATUS.md](cobre-mobile/STATUS.md).

## Observações

- Cada versão tem recursos e requisitos próprios; consulte a documentação da pasta correspondente.
- O repositório ainda não possui uma suíte de testes automatizados para validar a reprodução.
- O código do Desktop declara a licença <code>UNLICENSED</code>; consulte o autor antes de reutilizar ou redistribuir o código.
