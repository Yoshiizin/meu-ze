# 🦕 Ativar notificações Android em segundo plano (FCM)

A versão Android 1.1 tem suporte a pop-ups nativos para mensagens individuais e grupo geral. O som respeita **Geral / Esta conversa**: Fears to Fathom, retrô, áudio MP3/M4A/OGG próprio ou sem som. Para funcionar com o app em segundo plano, é necessário configurar Firebase + servidor; o APK 1.0 antigo **não** tem receptor nativo de push.

## 1. Firebase (projeto gratuito)

1. Acesse [Firebase Console](https://console.firebase.google.com/) e crie um projeto.
2. Adicione um **aplicativo Android** com pacote **`com.meuze.app`** (exatamente).
3. Em **Configurações do projeto > Geral**, encontre o ID do projeto, o número do projeto (Sender ID), o **App ID** Android (`1:...:android:...`) e a **API Key** do app.
4. Em **Contas de serviço**, gere uma chave privada JSON de uma conta de serviço com acesso a Firebase Cloud Messaging. **Nunca envie essa chave por chat, nem a coloque no GitHub.**
5. Garanta que a **Firebase Cloud Messaging API (HTTP v1)** esteja habilitada no projeto Google Cloud.

## 2. GitHub Actions — Secrets

Em [GitHub > Settings > Secrets and variables > Actions](https://github.com/Yoshiizin/meu-ze/settings/secrets/actions), crie os segredos:

| Nome | Valor |
| --- | --- |
| `FCM_APP_ID` | App ID Android Firebase |
| `FCM_API_KEY` | API Key do app Android |
| `FCM_SENDER_ID` | Número do projeto / Sender ID |
| `FCM_PROJECT_ID` | ID do projeto Firebase |

A build lê os secrets pelo ambiente do GitHub Actions e inicializa o Firebase programaticamente. Não é necessário adicionar `google-services.json` ao repositório.

## 3. Supabase — tabela de dispositivos

Abra o **SQL Editor** do projeto Supabase do Meu Zé e execute [`meu-ze-online/supabase/push-devices.sql`](../meu-ze-online/supabase/push-devices.sql). A tabela tem RLS ativado, sem políticas públicas: somente o servidor com service role pode registrar ou consultar tokens.

## 4. Vercel — Environment Variables

Em Vercel > projeto Meu Zé > Settings > Environment Variables, configure **somente no servidor**:

- `SUPABASE_SERVICE_ROLE_KEY`: chave service_role do Supabase (não usar `NEXT_PUBLIC_`).
- `FIREBASE_SERVICE_ACCOUNT_JSON`: o **conteúdo completo do JSON** da conta de serviço Firebase, como uma única variável (incluindo as quebras de linha escapadas no campo `private_key`).

Mantenha as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` já existentes. Faça um novo deploy da Vercel depois de salvar.

**Segurança:** o JSON da conta de serviço e a chave service_role jamais devem ser adicionados ao código, README ou APK.

## 5. Publicar APK 1.1

Com os quatro segredos GitHub definidos, vá em [Actions > Meu Zé Android APK](https://github.com/Yoshiizin/meu-ze/actions/workflows/android-apk.yml) > **Run workflow** na branch `main`. O pipeline publica **Meu-Ze.apk** na [aba Releases](https://github.com/Yoshiizin/meu-ze/releases) com tag `android-v1.1.0`. Sem esses segredos, ele só gera um APK de desenvolvimento **sem push habilitado** e não publica a versão 1.1.

**Importante:** o APK de teste é assinado com chave de debug temporária do GitHub Actions. Para instalar o APK 1.1 pode ser necessário desinstalar o APK 1.0; isso apaga as preferências locais do aplicativo, mas não a conta nem as mensagens armazenadas no Supabase. Para próximas atualizações sem desinstalação, configure uma chave de assinatura de release persistente.

## 6. Testar no Android

1. Instale o novo APK e entre na conta do Meu Zé.
2. Abra **Chat > Sons de notificação** (ou configurações gerais de som).
3. Ative **Pop-ups do Android mesmo com o app em segundo plano** e autorize as notificações quando o Android solicitar.
4. Escolha o som global e/ou um som específico para a conversa; sons personalizados precisam terminar de baixar ao menos uma vez com o app aberto.
5. Coloque o aplicativo em segundo plano, sem forçar a parada, e peça para outra pessoa mandar mensagem.

O app usa **mensagens de dados FCM**, entregues ao receptor Android, que cria o pop-up e reproduz o som selecionado. A entrega pode ser atrasada por economia de bateria, rede ou restrições do Android. Se o usuário **forçar a parada** do aplicativo, o Android bloqueia notificações até a próxima abertura. A opção `Sem som` por conversa silencia completamente a notificação dessa conversa.

**Nota sobre personalização:** os sons são salvos por conta **neste aparelho**, não sincronizados entre celulares. O Android pode limitar o volume e a reprodução de áudio quando o processo está restrito. A versão iPhone PWA permanece inalterada; push em segundo plano no iOS requer configuração separada.
