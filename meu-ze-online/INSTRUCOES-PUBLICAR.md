# MEU ZÉ — colocar online para os amigos (Windows)

Esta pasta é uma versão independente do projeto. **A parte visual foi preservada** e a antiga autenticação de Sites/ChatGPT + banco D1 foi substituída por **Supabase Auth + Postgres com RLS**, para que cada pessoa use e-mail e senha próprios. A publicação pode ser feita em **Vercel**. Você não precisa comprar domínio: o serviço fornece um endereço `*.vercel.app`.

⚠️ **Não está publicado automaticamente.** Sem acesso à sua conta Supabase e Vercel, não é possível criar o banco e o domínio por você. Primeiro faça os passos a seguir.

## 1) Crie o banco e a autenticação

1. Entre em **https://supabase.com/dashboard** e crie uma conta/projeto novo chamado `meu-ze`.
2. Aguarde a criação do banco e vá em **SQL Editor > New query**.
3. Abra `supabase/01-estrutura-e-seguranca.sql` no Bloco de Notas, copie o conteúdo inteiro para o editor SQL e clique **Run**. Ele cria perfis, posts, curtidas, comentários, membros e regras de acesso. **Faça isso só uma vez por projeto.**
4. Abra `supabase/02-criar-convite.sql`. Troque `TROQUE-ESTE-CODIGO-ANTES-DE-EXECUTAR` por uma frase secreta com **20 caracteres ou mais** (por exemplo, uma sequência aleatória que você inventou). Copie o SQL alterado para o SQL Editor e execute. **Não envie esse arquivo já preenchido num repositório público.**
5. Vá em **Authentication > Providers > Email**. Mantenha o provedor de e-mail habilitado. Você pode manter a confirmação de e-mail habilitada (recomendado). Caso ela esteja ativa, seus amigos terão de clicar no link enviado por e-mail antes de entrar. O envio de e-mails padrão da Supabase pode ter limites: confira as configurações de e-mail.

## 2) Copie as duas informações de conexão

No painel da Supabase, abra **Project Settings > API Keys** (ou **Connect**, conforme a interface). Você precisa de:

- `Project URL`: parecido com `https://abcd1234.supabase.co`.
- `Publishable key` (`sb_publishable_...`) ou `anon` key pública (`eyJ...`). **Use somente a chave pública**, nunca `service_role` / `secret`.

No Windows, na pasta descompactada, copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Não publique o arquivo `.env.local`: ele está no `.gitignore`. Mesmo sendo uma chave pública, use uma única cópia bem configurada.

## 3) Teste no seu computador

Instale **Node.js 22.13 ou mais novo** de https://nodejs.org/ . Abra PowerShell dentro da pasta descompactada do projeto e execute:

```powershell
npm.cmd install
npm.cmd run dev
```

Abra **http://localhost:3000**. Deve aparecer a tela inicial. Ao tocar em **Entrar**, use **Criar uma conta**, confirme e-mail (quando solicitado), faça login e digite seu código de convite. Personalize o perfil, faça uma postagem, saia e entre com uma segunda conta para testar que os dois perfis conseguem se ver.

Dica: no Windows, use `npm.cmd` e `npx.cmd` em vez de `npm` se o PowerShell bloquear o arquivo `npm.ps1`.

## 4) Coloque no ar com Vercel

1. Crie uma conta em **https://vercel.com**.
2. Ainda no PowerShell **na pasta do projeto**, execute:

```powershell
npx.cmd vercel link
```

Autorize a conexão à sua conta e, quando solicitado, crie um projeto novo `meu-ze` na Vercel. O framework detectado deve ser **Next.js** e a pasta raiz deve ser a pasta atual.

3. Cadastre as duas variáveis na Vercel para **Production** (cole os mesmos valores de `.env.local` quando solicitar):

```powershell
npx.cmd vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx.cmd vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

4. Publique a versão final:

```powershell
npx.cmd vercel deploy --prod
```

A Vercel mostrará no terminal seu endereço público `https://seu-projeto.vercel.app`. É esse link que você manda para seus amigos. Se alterar variáveis depois, execute novamente `npx.cmd vercel deploy --prod` para aplicá-las ao novo build.

## 5) Libere os links de confirmação / recuperação de senha

Volte à **Supabase > Authentication > URL Configuration**:

- **Site URL**: coloque o endereço de produção `https://seu-projeto.vercel.app` (sem barra final).
- Em **Redirect URLs**, acrescente `https://seu-projeto.vercel.app/**`.
- Enquanto estiver testando localmente, adicione `http://localhost:3000/**` à lista de redirecionamentos.

Isso permite que links de confirmação e recuperação de senha retornem ao site certo.

## 6) Cada amigo terá a conta dele

1. Você manda o link público e o **código de convite** separadamente para a pessoa.
2. O amigo acessa o site pelo celular, clica **Entrar > Criar uma conta**.
3. Ele cadastra o e-mail e uma senha individual e confirma o e-mail, se exigido.
4. Após login, digita o código secreto uma vez.
5. Agora pode postar, curtir, comentar, personalizar cores, fontes, capa, foto e visitar os perfis dos outros. As mudanças ficam armazenadas no banco e são vistas pelos amigos que entraram no grupo.

Uma pessoa com o link **sem convite** pode criar conta de autenticação, mas **não acessa** os dados da galera. O código é compartilhável: qualquer pessoa que o descubra pode entrar. Para cancelar um convite vazado, execute no SQL Editor `update private.access_codes set active=false where code='CODIGO-ANTIGO';` e crie outro com o arquivo 02. Isso não expulsa quem já entrou. Para remover um usuário, exclua sua linha em `public.members` usando o painel da Supabase (Table Editor) com cuidado.

## Cuidados e limites

- O projeto é uma **rede privada por convite**, não um sistema administrativo completo com convites individuais de uso único.
- O feed atualiza a cada 30 segundos; não há chat privado em tempo real.
- As fotos são comprimidas e incluídas nos registros do banco. Para muitos usuários/fotos, vale migrá-las para Supabase Storage.
- A tabela de posts traz até 500 publicações recentes para o feed. Se crescer muito, implemente paginação.
- Senhas são geridas pelo **Supabase Auth**, não guardadas no banco da aplicação.
- **RLS** protege os registros no próprio banco: só membros autorizados leem dados e apenas o autor altera seu perfil ou remove seus posts.
- Consulte os limites atuais dos planos gratuitos de Supabase e Vercel. Um projeto pessoal pequeno costuma poder começar sem pagar, mas nenhuma cota é garantida.
- Desative o signup no Supabase apenas se preferir cadastrar/convidar manualmente usuários pelo painel; o fluxo de **Criar uma conta** exige signup habilitado.

## Onde estão os arquivos

- `app/social.tsx`: telas e recursos que preservam a aparência do Meu Zé.
- `app/api/social/route.ts`: API protegida por token e membros.
- `lib/supabase.ts`: cliente de login e sessões.
- `supabase/01-estrutura-e-seguranca.sql`: tabelas e regras RLS.
- `supabase/02-criar-convite.sql`: cria seu primeiro código de acesso.
- `.env.example`: exemplo das duas variáveis.

**Status desta entrega:** arquivos gerados e sintaxe TypeScript/TSX analisada, mas o `npm install`/build completo e os testes entre contas reais **não foram executados aqui**, pois o ambiente não conseguiu acessar o registro npm; publicação exige suas contas nos serviços citados.
