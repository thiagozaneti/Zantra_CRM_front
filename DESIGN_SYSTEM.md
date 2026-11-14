# Padrões de interface do Zantra

Este documento registra os padrões utilizados no front-end. As permissões, operações financeiras e regras de negócio continuam sendo verificadas pelo backend. Nenhum padrão visual substitui essas verificações.

## Identidade e navegação

- A identidade usa azul `brand` para ações principais e cinzas `surface` para texto e estrutura, definidos em `tailwind.config.js`. A fonte é Inter, com alternativas do sistema.
- A barra lateral identifica áreas de trabalho. A navegação contextual apresenta somente as páginas permitidas da área atual. O catálogo e os ícones dos módulos estão em `src/lib/navigation.ts`.
- Use ícones Lucide que representem a atividade e acompanhe ações importantes com texto. Um ícone isolado precisa de nome acessível; cor sozinha não comunica estado.
- A página inicial oferece atalhos autorizados e mantém os indicadores do dashboard para quem pode acessá-los. O PDV conserva sua estrutura e seus atalhos próprios.

## Componentes e estados

- Use `btn-primary` para a ação principal, `btn-secondary` para ações alternativas e `btn-danger` para ações destrutivas. Desabilite operações em andamento e descreva o processamento.
- Use `card`, `card-header` e `card-body` para agrupar informações relacionadas; evite cartões aninhados sem necessidade.
- Relacione cada rótulo visível ao campo por `htmlFor` e `id`, ou envolva o controle no elemento `label`. Explique os campos obrigatórios e apresente o erro perto do formulário.
- Use `FilterBar` e `Pagination` em listagens onde forem adequados. Indique carregamento, falha e resultado vazio como situações diferentes; filtros devem poder ser limpos.
- Use `useConfirm` para confirmar ações críticas e `useToast` para o resultado. Não afirme que nada foi alterado quando uma operação pode ter sido parcialmente concluída.
- Mensagens devem explicar o ocorrido e a próxima ação, sem expor detalhes técnicos. Não remova dados operacionais necessários para simplificar a interface.

## Acessibilidade e adaptação

- Mantenha o foco visível, a navegação por teclado e a preferência por movimento reduzido de `src/index.css`.
- Em telas pequenas, use menu recolhível, alvos de toque confortáveis e conteúdo que possa ser lido sem cortar ações. Tabelas largas podem rolar horizontalmente dentro de seu próprio contêiner.
- Use textos e ícones em conjunto para estados importantes. Preserve nomes de negócio familiares à equipe e não dependa exclusivamente de abreviações.
- Os padrões são orientações de implementação, não uma declaração de conformidade WCAG. Verificações técnicas, dispositivos reais e avaliação com usuários continuam necessários.

## Validação antes de publicar

Execute `npm test` e `npm run build`. Confira permissões, operações críticas, navegação por teclado, responsividade, impressão e leitura de cartão no ambiente operacional. A validação de usabilidade com usuários e as métricas de tempo, erros e autonomia precisam ser realizadas com a equipe; não há metas de melhoria garantidas.
