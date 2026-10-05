# Resultados e pendências Lighthouse

## Medição de 05/10/2026

Os relatórios completos HTML/JSON, o ambiente e o resumo de medianas estão em [`reports-2026-10-05T20-13-17-293Z/`](reports-2026-10-05T20-13-17-293Z/). Foram executadas três auditorias por página e perfil, em build de produção, com Chrome Headless 154.0.0.0, Node 22.17.1 e Lighthouse 12.8.2.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | desktop | 63 | 96 | 96 | 83 | 4072 ms | 0.000 | 24 ms |
| `/` | mobile | 81 | 96 | 93 | 83 | 4225 ms | 0.000 | 25 ms |
| `/nft/emerald-ape-0042` | desktop | 62 | 100 | 96 | 83 | 4148 ms | 0.000 | 16 ms |
| `/nft/emerald-ape-0042` | mobile | 81 | 96 | 96 | 83 | 4146 ms | 0.000 | 12 ms |

## Metas pendentes

- **Performance:** as quatro medições estão abaixo de 90. LCP ficou entre 4,07 e 4,23 s; TBT entre 12 e 25 ms e CLS em 0.000. O perfil indica carregamento/renderização inicial como principal área a investigar; confirmar a causa com trace/perfil antes de atribuir o atraso a um recurso específico.
- **SEO:** as quatro medições ficaram em 83, abaixo de 90. Os relatórios marcam ausência de `meta description` e falha na leitura de `robots.txt` (a resposta contém 29 erros de análise).
- **Boas práticas:** a home mobile ficou em 93, abaixo de 95; os outros três grupos atingiram 96.
- **Acessibilidade:** todas as medições atingiram ou superaram 95.

Esses resultados são medições reais da build registrada no commit `fd8aed1`; não representam metas atingidas. Reexecute `npm run lighthouse` após qualquer otimização ou mudança de código e compare a nova pasta de relatórios antes de substituir esta referência.
