# Meu Zé — aplicação web (Next.js)

Aplicação da rede social retrô **Meu Zé 2.0**, voltada para um grupo de amigos com login e ingresso por convite. O código é público, mas a participação na rede é controlada pelo sistema de contas e autorizações.

Funcionalidades implementadas no código: feed com publicações, comentários e curtidas; perfis altamente personalizáveis; chat geral e privado com mídias; configurações de sons; PWA; e suporte aos fluxos de notificações.

**Stack:** Next.js 16, React 19, TypeScript e Supabase (Auth/Postgres/Storage). Deploy web na Vercel. Requer Node.js >=22.13.0.

## Rodar localmente

```bash
npm install
npm run dev
```

Configure suas próprias variáveis de ambiente, incluindo `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, a partir de um projeto Supabase que você administra. Não comite arquivos de ambiente ou chaves de serviço.

Para implantação consulte [INSTRUCOES-PUBLICAR.md](./INSTRUCOES-PUBLICAR.md) e os scripts em [supabase/](./supabase).

A interface pode apresentar conteúdo de demonstração sem banco configurado; isso não habilita acesso à rede real. Os serviços backend precisam de autenticação, regras RLS e configurações próprias. A disponibilidade de chat/push depende de suas políticas e configuração do deploy.

> O Meu Zé é um projeto independente de estética nostálgica, e não uma cópia binária ou produto oficial de outras redes.
