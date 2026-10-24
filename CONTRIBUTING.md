# Contribuindo com o Meu Zé 🦕

O Meu Zé é um projeto independente com uma comunidade de acesso por convite, mesmo com o repositório de código público. Melhorias de interface retrô, usabilidade mobile, documentação e segurança são bem-vindas.

## Como colaborar

- Para problemas, abra uma [Issue](https://github.com/Yoshiizin/meu-ze/issues) com o navegador/Android, passos de reprodução e resultado esperado.
- Para melhorias, faça um fork e envie um Pull Request com descrição e capturas de uma conta de demonstração.
- Para o frontend, use Node.js 22.13+ e rode `npm run typecheck` e `npm run build` em `meu-ze-online/` quando tiver variáveis de ambiente de teste.
- Não envie alterações que exponham convites reais, dados de membros ou bypass de políticas RLS.
- Qualquer screenshot de colaboração deve usar **dados fictícios** e indicar se é captura real ou mockup.

## Segredos e arquivos locais

Nunca publique `.env`, `.env.local`, chaves de serviço, tokens FCM, certificados/keystores privados ou credenciais. As variáveis `NEXT_PUBLIC_*` são públicas por definição; elas não substituem controles no Supabase/Firebase.

## Licença

As partes originais deste projeto estão sob [MIT](./LICENSE). Preserve os avisos de licença; consulte [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) antes de redistribuir áudio, imagens, dependências ou conteúdo de membros. A licença não transfere direitos sobre materiais de terceiros.
