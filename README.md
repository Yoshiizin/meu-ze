# 🦕 Meu Zé 2.0

**A internet é nossa.** Uma rede social para um grupo de amigos, com feed, perfis personalizáveis e conversas em um só lugar.

> ## 🚀 ATUALIZAÇÃO DISPONÍVEL — MEU ZÉ 2.0
>
> **Nova edição Android 2.0.0** com suporte a notificações push em segundo plano, pop-ups nativos e sons configuráveis por conversa.
>
> 📲 **[⬇️ BAIXAR MEU ZÉ 2.0 PARA ANDROID](https://github.com/Yoshiizin/meu-ze/releases/download/android-v2.0.0/Meu-Ze.apk)**
>
> 🏷️ [Ver lançamento e notas da versão 2.0](https://github.com/Yoshiizin/meu-ze/releases/tag/android-v2.0.0)

## ✨ O que tem no Meu Zé?

- **Feed da galera:** publicações, curtidas, comentários e atualização ao puxar para baixo.
- **Perfis personalizados:** cada pessoa pode deixar seu cantinho com a própria identidade visual.
- **Conversas:** chat privado e grupo geral.
- **Notificações Android:** pop-ups em segundo plano e escolha de som geral ou por conversa, incluindo áudio personalizado, com a permissão do usuário.
- **Acesso por convite:** a rede social continua restrita aos membros autorizados, mesmo que o código-fonte do projeto seja público.

## 📱 Instalação

### Android — Meu Zé 2.0

1. Baixe o **[Meu-Ze.apk](https://github.com/Yoshiizin/meu-ze/releases/download/android-v2.0.0/Meu-Ze.apk)** no celular (Android 10 ou superior).
2. Abra o arquivo e autorize a instalação pelo Android, se solicitado.
3. Entre com sua conta do Meu Zé.
4. Para notificações em segundo plano, habilite os pop-ups nas configurações de sons do chat e conceda a permissão de notificações.

**Atenção:** este é um APK de teste, assinado com chave temporária. Uma atualização pode exigir desinstalar a versão anterior. Conta, amigos e mensagens ficam no servidor; preferências locais podem ser apagadas.

### iPhone

Abra **[meu-ze.vercel.app](https://meu-ze.vercel.app)** no Safari e use **Compartilhar → Adicionar à Tela de Início**. A versão web usa as mesmas contas e conversas.

## 🔐 Privacidade e segurança

O **repositório público** (quando habilitado) mostra o **código-fonte**, não concede acesso automático à rede social: a entrada de membros depende de autenticação e convite. As permissões do banco são controladas por políticas de acesso (RLS).

As credenciais administrativas devem ficar **exclusivamente** em variáveis protegidas nos serviços correspondentes. **Nunca publique** no GitHub:

- O JSON privado de conta de serviço do Firebase.
- A chave `SUPABASE_SERVICE_ROLE_KEY` ou outros segredos de servidor.
- Arquivos `.env.local`, códigos de convite reais, tokens pessoais ou senhas.

As configurações de cliente do Firebase e a chave pública/anon do Supabase **não substituem** a segurança das regras do servidor. A pasta de mídia do projeto usa armazenamento público: arquivos enviados a ela podem ser acessados por quem possuir o link.

## 🛠️ Estrutura do projeto

| Diretório | Conteúdo |
| --- | --- |
| [`meu-ze-online/`](./meu-ze-online) | Site Next.js, interface e APIs |
| [`android/`](./android) | Aplicativo Android (WebView + Firebase Cloud Messaging) |
| [`meu-ze-online/supabase/`](./meu-ze-online/supabase) | Estrutura SQL e políticas do banco |
| [`.github/workflows/`](./.github/workflows) | Compilação e publicação de APK |

Para desenvolvedores: [instruções do Android](./android/README.md) · [configuração de push](./android/PUSH-SETUP.md) · [GitHub Actions](https://github.com/Yoshiizin/meu-ze/actions/workflows/android-apk.yml).

---

**Meu Zé 2.0** — feito para a nossa galera. 🦕
