# Meu Zé para Android e iPhone

O Android usa um aplicativo nativo WebView que abre https://meu-ze.vercel.app/ em tela cheia. O iPhone continua usando a versão web instalável pelo Safari (PWA). Ambos usam as mesmas contas, chats, feed e Supabase.

## Baixar APK Android

**[⬇️ Obter o APK atualizado pelo GitHub Actions](https://github.com/Yoshiizin/meu-ze/actions/workflows/android-apk.yml)**

Na execução mais recente com status **Success**, procure **Artifacts** e baixe o ZIP do APK. Releases antigas podem conter um áudio sem comprovação de permissão de redistribuição; por isso recomenda-se a compilação atualizada. O repositório é público. As Releases podem ser consultadas sem acesso à rede social; para entrar no Meu Zé é necessário ter uma conta autorizada e convite.

1. No Android, baixe o arquivo `.apk` pelo link acima.
2. Abra o APK e, se o Android solicitar, permita a instalação dessa fonte.
3. Abra o Meu Zé pelo ícone do dinossaurinho.

O APK do GitHub Actions vem dentro de um ZIP e deve ser extraído antes da instalação.

É um APK de teste assinado com chave de debug gerada pelo runner. Para atualizar com outro build, pode ser necessário desinstalar a versão anterior. Desinstalar apaga apenas dados locais do app, não a conta ou mensagens no Supabase. Para distribuir atualizações estáveis, crie e guarde uma chave de assinatura de release privada; não a comite no GitHub.

## Notificações Android em segundo plano

[**Como ativar pop-ups e sons personalizados com Firebase**](./PUSH-SETUP.md)

## Android Studio
Abra a pasta `android/` (JDK 17, Gradle 8.10.2, Android SDK 35), execute `assembleDebug` e encontre o APK em `app/build/outputs/apk/debug/app-debug.apk`.

## iPhone
Abra https://meu-ze.vercel.app/ no Safari e escolha **Compartilhar > Adicionar à Tela de Início**. O PWA usa o mesmo site e atualiza sem reinstalação.

## Limitações
- Internet necessária para feed e chat.
- Mídias são escolhidas pelo seletor de arquivos Android.
- A versão 2.0 inclui suporte nativo a notificações FCM, mas exige configurar Firebase, Supabase e Vercel. Veja [PUSH-SETUP.md](./PUSH-SETUP.md). A versão 1.0 não recebe push em segundo plano.
- APK é exclusivo do Android. Não se instala no iPhone.
- Nunca embuta chaves privadas ou credenciais do Supabase no app.
