# Meu Zé para Android e iPhone

O Android usa um aplicativo nativo WebView que abre https://meu-ze.vercel.app/ em tela cheia. O iPhone continua usando a versão web instalável pelo Safari (PWA). Ambos usam as mesmas contas, chats, feed e Supabase.

## Baixar APK Android
1. No GitHub do projeto, entre em **Actions > Meu Zé Android APK**.
2. Abra a execução concluída e, em **Artifacts**, baixe **Meu-Ze-Android-APK**.
3. Extraia o ZIP e instale **app-debug.apk** no Android 10 ou superior.
4. Pode ser necessário autorizar a instalação de apps desta fonte.

É um APK de teste assinado com chave de debug gerada pelo runner. Para atualizar com outro build, pode ser necessário desinstalar a versão anterior. Desinstalar apaga apenas dados locais do app, não a conta ou mensagens no Supabase. Para distribuir atualizações estáveis, crie e guarde uma chave de assinatura de release privada; não a comite no GitHub.

## Android Studio
Abra a pasta `android/` (JDK 17, Gradle 8.10.2, Android SDK 35), execute `assembleDebug` e encontre o APK em `app/build/outputs/apk/debug/app-debug.apk`.

## iPhone
Abra https://meu-ze.vercel.app/ no Safari e escolha **Compartilhar > Adicionar à Tela de Início**. O PWA usa o mesmo site e atualiza sem reinstalação.

## Limitações
- Internet necessária para feed e chat.
- Mídias são escolhidas pelo seletor de arquivos Android.
- Notificações push quando o aplicativo está fechado ainda precisam de integração nativa (FCM). Sons da página dependem do app aberto.
- APK é exclusivo do Android. Não se instala no iPhone.
- Nunca embuta chaves privadas ou credenciais do Supabase no app.
