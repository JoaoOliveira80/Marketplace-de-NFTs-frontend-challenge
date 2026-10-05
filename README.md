# Kurio — Marketplace de NFTs

Aplicação demonstrativa para descoberta e compra simulada de NFTs. O frontend usa Vite, React, TypeScript, TanStack Router/Query, Axios, MSW, Socket.IO, Tailwind CSS v4, primitives Base UI compatíveis com shadcn/ui, Playwright e Lighthouse. As artes servidas no app usam WebP responsivo em 250/500/1000 px.

> **Deploy público:** a configuração para Vercel está pronta, mas a publicação e a URL pública ainda dependem da conta do candidato. Nenhum serviço externo foi conectado nesta cópia.

## Requisitos

- Node.js 20.19 ou superior e npm (requisito do Vite 8).
- Chrome para executar os testes Playwright e, adicionalmente, as auditorias Lighthouse. Configure `CHROME_PATH` se o Chrome não estiver no caminho detectado automaticamente.

## Rodar localmente

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`. Os mocks MSW são iniciados no navegador e permanecem ativos no build de demonstração. Para criar uma build e servi-la localmente:

```bash
npm run build
npm run preview
```

As rotas do marketplace são SPA. A configuração Vercel reescreve caminhos para `index.html`, permitindo abrir e atualizar links como `/nft/emerald-ape-0042`, `/checkout` e `/orders/<id>` diretamente.

## Contas fictícias

- `nova@kurio.dev` / `Kurio123!`
- `sam@kurio.dev` / `Kurio123!`

Também é possível criar contas de teste pela tela de cadastro. Os dados ficam somente no armazenamento local da origem atual e são apagados pelo reset. Não use informações pessoais reais: a autenticação e os pagamentos são simulados no navegador.

## Cenários reproduzíveis

Os cenários são selecionados pelo parâmetro `mock` na URL. Exemplos:

- Catálogo: `/?mock=empty`, `/?mock=slow`, `/?mock=error`, `/?mock=offline`, `/?mock=out-of-order`.
- Sessão/favoritos/perfil/carteira: `?mock=session-expired`, `?mock=favorite-error`, `?mock=profile-error`, `?mock=wallet-error`, `?mock=wallet-refused`.
- Carrinho/cupom/pedido: `?mock=cart-error`, `?mock=order-refused`, `?mock=order-timeout`, `?mock=order-pending`.
- Tempo real: `?mock=realtime-price`, `?mock=realtime-sold-out`. Abra a rota do checkout com o item correspondente no carrinho; o socket simulado publica a mudança enquanto a página está aberta.

Códigos de cupom: `KURIO10` e `LANCAMENTO` são válidos; `EXPIRADO` simula expiração. Qualquer outro código é inválido. Tentar cadastrar `nova@kurio.dev` ou `sam@kurio.dev` demonstra conflito de cadastro.

O painel de controle de realtime também é servido pelos mocks REST. Por exemplo, no console do navegador:

```js
await fetch("/api/mock/realtime/disconnect", { method: "POST" });
await fetch("/api/mock/realtime/nfts/emerald-ape-0042", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ editionId: "fifty", priceEth: "1.7", available: 49 }),
});
```

O endpoint `POST /api/mock/realtime/replay` reproduz eventos para testar duplicatas e versões antigas; `/api/mock/realtime/orders/:orderId/settle` encerra imediatamente um pedido pendente do usuário autenticado.

### Reset completo do demo

```js
await fetch("/api/mock/reset", { method: "POST" });
location.assign("/");
```

O reset apaga todas as chaves `kurio-*` de `localStorage` e `sessionStorage`, cancela eventos de preço/disponibilidade já agendados e limpa o cache de queries. Preferências sem relação com a aplicação são preservadas. Os usuários e os NFTs semeados são fixtures imutáveis no código e continuam disponíveis. Os testes chamam a mesma rota e recarregam a página antes de cada caso.

## Verificações

| Comando | O que faz |
| --- | --- |
| `npm run typecheck` | Executa `tsc -b` sem emitir arquivos |
| `npm run lint` | Executa ESLint |
| `npm run build` | Typecheck e build Vite de produção |
| `npm run test:e2e` | Executa Playwright em Chromium desktop (1440×1000) e mobile (390×844), inicia Vite dev e gera relatório HTML |
| `npm run test:e2e:report` | Abre o último relatório Playwright |
| `npm run test:e2e:update-snapshots` | Atualiza os baselines visuais; revise cada alteração antes de manter |
| `npm run test:e2e:preview` | Faz build e testa deep link/refresh contra `vite preview` em desktop e mobile |
| `npm run test:lighthouse` | Testa mediana e validação dos relatórios Lighthouse com fixtures sintéticas marcadas como teste |
| `npm run lighthouse` | Faz build e roda 12 auditorias Lighthouse reais (2 páginas × 2 perfis × 3 execuções) |

Os testes principais cobrem os 12 grupos do enunciado em desktop e mobile. Os arquivos PNG de baseline, traces em falha e relatórios HTML ficam em `tests/e2e/__screenshots__/`, `test-results/` e `playwright-report/`, conforme a finalidade; apenas os baselines versionáveis são parte dos testes-fonte. A verificação responsiva adicional usa 768px.

## Lighthouse

`npm run lighthouse` usa uma build de produção, abre um preview local, executa a página inicial e `/nft/emerald-ape-0042` em perfis mobile e desktop três vezes cada e calcula medianas de Performance, Accessibility, Best Practices, SEO, LCP, CLS e TBT. Cada relatório HTML/JSON e os metadados de ambiente são gravados em uma nova pasta `lighthouse/reports-<data>/`. Chrome é encerrado a cada auditoria e o preview é encerrado mesmo quando uma execução falha. Em caso de erro, a pasta temporária e qualquer resumo parcial são removidos.

Consulte a [medição local mais recente](lighthouse/reports-2026-10-05T15-53-25-328Z/summary.md) e os limites que ficaram pendentes em [`lighthouse/README.md`](lighthouse/README.md).

Defina `CHROME_PATH` quando for necessário indicar um Chrome específico. Os testes unitários de `scripts/summarize-lighthouse.mjs` usam resultados sintéticos apenas para verificar o cálculo; esses fixtures nunca são apresentados como medições do produto. Metas do desafio: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 e SEO ≥ 90.

## Publicar na Vercel

1. Importe este repositório na Vercel e selecione o preset Vite.
2. Use `npm run build` como comando de build e `dist` como diretório de saída.
3. Mantenha `vercel.json` na raiz: o rewrite encaminha as rotas de cliente a `/index.html`.
4. Publique e valide a home, um detalhe de NFT e refresh em `/nft/emerald-ape-0042`.

A aplicação não precisa de variáveis de ambiente para o modo mock atual. A URL pública deve ser acrescentada a este README depois da publicação pela conta do candidato.
