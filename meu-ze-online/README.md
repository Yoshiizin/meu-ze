# Meu Zé — edição online privada

Projeto Next.js para uma rede social de amigos com login individual, e-mail/senha, perfis personalizáveis, feed, curtidas, comentários e código de convite. Visual retro do projeto original preservado.

**Comece por:** [INSTRUCOES-PUBLICAR.md](./INSTRUCOES-PUBLICAR.md)

Banco e auth: Supabase (Postgres/RLS). Hospedagem: Vercel (Next.js). Requer Node.js >=22.13.0. As chaves necessárias são apenas públicas, com acesso protegido por JWT + políticas RLS. Não há chave service_role no app.

O projeto não é um clone 100% do PI.FYI, não inclui conversas privadas, e foi preparado para implantação externa sem depender da autenticação proprietária da exportação original.
