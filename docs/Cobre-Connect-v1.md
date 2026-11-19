# Cobre Connect — contrato inicial de conexão local

**Status:** primeira fatia implementada no backend e no Desktop. O Cobre ID 0.2.0 agora pode emitir códigos de TV, aprová-los por uma sessão autenticada e entregar sessão à TV por polling. A janela Conta Cobre do Desktop ganhou entrada para aprovar o código. Os clientes Mobile/TV ainda não implementam a solicitação/polling; o contrato local para servir a biblioteca do Desktop também ainda não está implementado.

## Objetivo

Permitir que o Cobre Mobile e o Cobre TV acessem a biblioteca servida pelo Cobre Desktop na mesma rede local, e que o Cobre ID identifique, autorize e permita revogar os aparelhos vinculados.

O Cobre ID deve cuidar de identidade, aprovação e vínculo dos aparelhos. O Desktop deve continuar entregando os arquivos de áudio diretamente pela rede local. O áudio não passa pelo servidor central do Cobre ID.

## O que já existe no Desktop

O módulo remoto de `features-main.js` cria um servidor HTTP na porta `8787` e já oferece:

- estado da faixa atual em `/api/np`;
- comandos por `/api/cmd`;
- biblioteca em `/api/lib`;
- capas em `/cover/:id`;
- áudio em `/stream/:id`, com suporte ao cabeçalho HTTP `Range` para busca na faixa.

Hoje, o serviço usa uma chave compartilhada salva em `remote.json`, aceita a chave na query string `?k=...`, escuta em `0.0.0.0` e usa HTTP sem TLS. A rota de comandos altera estado por GET. Esse conjunto é útil como controle remoto local, mas ainda não fornece autorização Cobre ID por aparelho.

O cliente Cobre ID do Desktop implementa cadastro/login por e-mail e senha, renovação de sessão, listagem e remoção de aparelhos e presença. A Conta Cobre agora também pode aprovar um código de TV. O Desktop ainda não oferece a interface para solicitar/pollar o código como um cliente TV nem concessões de acesso à biblioteca local.

O backend Cobre ID localizado já implementa contas, refresh rotativo, JWT HS256 de curta duração, lista/revogação de dispositivos e presença. O tipo `tv` já é aceito no registro tradicional. A etapa inicial de pareamento por código agora tem os endpoints `POST /v1/device/authorization`, `POST /v1/device/authorize` e `POST /v1/device/token`; a Conta Cobre do Desktop consegue aprovar o código. Isso registra a TV na conta, mas **não** autoriza automaticamente a TV a ler uma biblioteca de Desktop.

## Papéis

- **Cobre Desktop:** host local. Indexa a biblioteca e serve metadados, capas e áudio enquanto estiver ligado e com o recurso ativado.
- **Cobre ID:** autoridade de conta. Autoriza aparelhos, registra vínculos e possibilita revogação.
- **Cobre Mobile e Cobre TV:** clientes. Encontram um Desktop na rede local e acessam somente os recursos autorizados para aquele aparelho.

## Topologia desejada

```text
                         HTTPS: conta, autorização e revogação
                   ┌─────────────────────────────────────────┐
                   │               Cobre ID                  │
                   └──────────────────┬──────────────────────┘
                                      │ concede acesso
                                      │
┌───────────────────┐       LAN       ▼       LAN       ┌───────────────────┐
│ Cobre Mobile      │ ◄──────────► Cobre Desktop ◄────► │ Cobre TV          │
│ navega/controla   │        biblioteca e áudio          │ navega/reproduz   │
└───────────────────┘                                    └───────────────────┘
```

O acesso fora de casa fica fora do primeiro lançamento. Não se deve abrir a porta do Desktop diretamente na internet.

## Pareamento proposto

1. A pessoa ativa **Conectar aparelhos** no Desktop. O Desktop inicia o host local e apresenta seu nome, estado e opções de pareamento.
2. O Desktop anuncia apenas informações de descoberta pela rede local via mDNS/DNS-SD, por exemplo serviço `_cobre-connect._tcp`, `hostId`, porta, versão principal da API e nome amigável. Não anuncia caminhos da biblioteca, títulos tocando ou segredos.
3. No Mobile, a pessoa entra no Cobre ID e seleciona um Desktop descoberto. No Google TV, o app mostra um código curto e uma URL/QR para autorização pelo celular. O padrão OAuth Device Authorization Grant foi criado para aparelhos com entrada limitada; a TV deve respeitar o intervalo de consulta e a expiração dos códigos.
4. A pessoa autentica no Cobre ID por um segundo aparelho e confirma qual TV ou Mobile está autorizando e a qual Desktop ela terá acesso.
5. O Cobre ID registra a autorização associada ao usuário, ao aparelho cliente e ao `hostId`. O Desktop aceita apenas uma concessão destinada a si, com validade e escopos explícitos.
6. O cliente conecta-se ao endereço local descoberto e obtém uma sessão local limitada àquele host. Se mDNS não funcionar, a interface oferece QR do Desktop ou entrada manual do endereço/código.
7. A pessoa pode revogar o aparelho em **Conta Cobre**. O host deixa de aceitar a concessão após a atualização de revogações ou a expiração curta da sessão.

### Requisitos de autorização

A API local deve aceitar `Authorization: Bearer …`, nunca tokens na URL. A concessão deve identificar, no mínimo, emissor, usuário, aparelho cliente, host destinatário, validade e escopos. O Desktop deve rejeitar token expirado, para outro host, para outro emissor ou sem o escopo exigido.

A estratégia exata para verificar concessões (assinatura assimétrica com chaves públicas do Cobre ID ou introspecção HTTPS) depende da implementação do backend do Cobre ID. Ela precisa ser definida antes do código: a assinatura permite validação local temporária sem ida ao servidor em cada requisição; a introspecção simplifica revogação imediata, mas requer internet para autorizar chamadas. O segredo de assinatura nunca pode ser embutido nos apps.

Para a TV, usar um fluxo de autorização de dispositivo em vez de pedir e-mail e senha com teclado do controle. O RFC 8628 descreve o fluxo para TVs e outros dispositivos com entrada limitada: https://datatracker.ietf.org/doc/html/rfc8628

## Contrato sugerido da API local v1

Toda resposta JSON usa UTF-8. Erros seguem formato consistente, por exemplo `{"error":"unauthorized","message":"Aparelho não autorizado"}`. IDs de faixa são opacos e específicos da biblioteca daquela instância; nunca são caminhos de arquivo fornecidos pelo cliente.

| Método e rota | Escopo | Uso |
|---|---|---|
| `GET /v1/health` | nenhum; sem dados privados | Descobrir versão da API e estado básico do host |
| `GET /v1/library?cursor=&limit=` | `library.read` | Listagem paginada de metadados da biblioteca |
| `GET /v1/now-playing` | `playback.read` | Estado da faixa, posição e reprodução |
| `GET /v1/tracks/{trackId}/cover` | `library.read` | Capa da faixa/álbum |
| `GET /v1/tracks/{trackId}/stream` | `stream` | Áudio; aceitar `Range` e responder `206` quando aplicável |
| `POST /v1/commands` | `playback.control` | Comando JSON: tocar, pausar, anterior, próxima, seek, fila e volume |

Exemplo de comando: `{"action":"seek","positionMs":65000}`. A rota de comando deve ser POST; leitura não deve mudar o estado do player. As respostas de comando confirmam aceitação e devolvem o estado atualizado ou um erro claro.

A implementação deve limitar tamanho de página, validar IDs e intervalos, tratar desconexões e stream interrompido, e não aceitar caminhos absolutos enviados pelo cliente. CORS não substitui autenticação.

## Descoberta e rede local

- Descoberta principal: mDNS/DNS-SD, limitada à rede local.
- Alternativas: QR gerado pelo Desktop e endereço/código manual.
- Mostrar no Desktop quando o host está ativo e quais aparelhos estão conectados.
- Não presumir que presença online no Cobre ID significa que o host está alcançável: a presença central não atravessa NAT nem descobre a rede Wi-Fi local.
- O host pode servir áudio quando não houver internet, desde que o cliente já tenha uma sessão local válida. Renovar conta e atualizar revogações pode exigir internet.

## Experiência da Google TV

A interface deve ser própria para tela grande: controles grandes, contraste forte, margens seguras e navegação completa pelo D-pad. Todas as ações visíveis precisam receber foco previsível; a orientação oficial do Android TV recomenda projetar e testar a navegação pelas quatro direções: https://developer.android.com/design/ui/tv/guides/foundations/navigation-on-tv

Para continuar reproduzindo ao sair da tela, a implementação Android deve manter player e sessão numa `MediaSessionService` da Media3, conforme a documentação Android: https://developer.android.com/media/media3/session/background-playback

## Fases recomendadas

1. **Contrato e segurança:** fechar os campos de identidade, token e autorização com o backend Cobre ID; definir limites de versão e erros.
2. **Desktop host v1:** colocar as rotas atuais atrás de `/v1`, trocar autenticação compartilhada por concessões por aparelho, usar POST para comandos, manter suporte a Range e permitir ativar/desativar o serviço claramente.
3. **Cobre ID:** implementar fluxo de código para TV, aprovação de aparelhos e concessões limitadas por `hostId` e escopos; revogação deve afetar hosts.
4. **Mobile:** integrar descoberta, pareamento, navegação e reprodução sobre o mesmo contrato.
5. **Google TV:** integrar pareamento por código, descoberta, UI D-pad e reprodução em segundo plano com Media3.
6. **Acesso fora de casa:** decidir separadamente entre VPN ou serviço de retransmissão autenticado; sem encaminhamento de porta aberto no roteador.

## Critérios mínimos de pronto para a primeira integração

- serviço desligado por padrão e estado visível no Desktop;
- nenhum segredo em query string ou log;
- aparelhos autorizados individualmente e revogáveis;
- escopo de leitura separado de controle e streaming;
- requisição sem credencial recebe `401`; usuário autorizado sem escopo recebe `403`;
- Mobile e TV conseguem descobrir o host na mesma LAN e têm uma alternativa manual;
- streaming suporta seek por HTTP Range sem carregar o arquivo inteiro em memória;
- parar o host encerra novas sessões e os streams ativos de forma previsível;
- teste de pareamento, expiração, revogação, queda de Wi-Fi, queda de internet e reconexão.

## Dependência para a próxima etapa

O fluxo inicial de autorização está implementado, mas falta construir a solicitação/polling na TV e aprovação no Mobile. A próxima dependência arquitetural é conceder ao aparelho autenticado acesso **a um Desktop específico**. Como o backend usa JWT HS256 com segredo privado do servidor, os clientes locais não devem tentar validar nem compartilhar esse segredo. Antes do stream protegido, definir um mecanismo de concessão curta por host (por exemplo, introspecção central com cache curto, ou um token assimétrico específico para conexão) e chaves por aparelho. Até essa etapa, o servidor local do Desktop permanece independente do Cobre ID, com sua chave compartilhada atual.
