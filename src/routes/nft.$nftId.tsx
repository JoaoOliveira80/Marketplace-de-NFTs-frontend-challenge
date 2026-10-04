import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { nftQueryOptions } from "@/features/catalog/catalog-api";

export const Route = createFileRoute("/nft/$nftId")({
  component: NftEntry,
});

function NftEntry() {
  const { nftId } = Route.useParams();
  const { data: nft, isPending, isError, refetch } = useQuery(nftQueryOptions(nftId));

  return (
    <section className="nft-entry" aria-labelledby="nft-entry-title">
      <Link to="/">← Voltar ao catálogo</Link>
      {isPending ? (
        <div className="nft-entry__layout" aria-busy="true" aria-label="Carregando NFT">
          <div className="nft-entry__image shimmer" />
          <div className="nft-entry__details"><div className="skeleton-line shimmer" /><div className="skeleton-line skeleton-line--short shimmer" /></div>
        </div>
      ) : isError || !nft ? (
        <div className="catalog-empty" role="alert">
          <h1 id="nft-entry-title">NFT não encontrado</h1>
          <p>Esta obra não está disponível no catálogo.</p>
          <button onClick={() => void refetch()} type="button">Tentar novamente</button>
        </div>
      ) : (
        <div className="nft-entry__layout">
          <img className="nft-entry__image" src={nft.image} alt={`${nft.name} #${nft.tokenId}`} />
          <div className="nft-entry__details">
            <p className="nft-entry__eyebrow">Kurio Editions</p>
            <h1 id="nft-entry-title">{nft.name} #{nft.tokenId}</h1>
            <strong className="nft-entry__price">{nft.priceEth} ETH</strong>
            <p>Um colecionável digital da coleção Kurio, disponível na rede {nft.network}.</p>
            <dl><div><dt>Edição</dt><dd>{nft.edition}</dd></div><div><dt>Categoria</dt><dd>{nft.category}</dd></div><div><dt>Rede</dt><dd>{nft.network}</dd></div></dl>
          </div>
        </div>
      )}
    </section>
  );
}
