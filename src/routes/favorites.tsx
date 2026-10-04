import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Heart } from "@phosphor-icons/react";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { favoritesQueryOptions } from "@/features/favorites/favorites-api";

export const Route = createFileRoute("/favorites")({
  beforeLoad: async ({ context, location }) => {
    let session;
    try {
      session = await context.queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        throw redirect({ to: "/login", search: { returnTo: location.href, expired: true } });
      }
      throw error;
    }
    if (!session.user) throw redirect({ to: "/login", search: { returnTo: location.href, expired: false } });
  },
  component: FavoritesPage,
  errorComponent: () => <section className="favorites-page"><h1>Não foi possível verificar sua sessão</h1><p>Verifique a conexão e tente novamente.</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section>,
});

function FavoritesPage() {
  const session = useQuery(sessionQueryOptions);
  const userId = session.data?.user?.id ?? "";
  const favorites = useQuery({ ...favoritesQueryOptions(userId), enabled: Boolean(userId) });

  return <section className="favorites-page" aria-labelledby="favorites-title">
    <div className="favorites-page__heading"><Heart size={25} weight="fill" /><h1 id="favorites-title">Meus favoritos</h1></div>
    {favorites.isPending ? <div className="favorites-page__skeleton shimmer" aria-busy="true" aria-label="Carregando favoritos" /> :
      favorites.isError ? <div role="alert"><p>Não foi possível carregar seus favoritos.</p><button type="button" onClick={() => void favorites.refetch()}>Tentar novamente</button></div> :
      favorites.data.items.length === 0 ? <div className="favorites-page__empty"><p>Você ainda não salvou nenhum NFT.</p><Link to="/">Explorar coleção</Link></div> :
      <div className="favorites-page__grid">{favorites.data.items.map((nft) => <Link key={nft.id} to="/nft/$nftId" params={{ nftId: nft.id }}><img src={nft.image} alt="" /><span>{nft.name} #{nft.tokenId}</span><strong>{nft.priceEth} ETH</strong></Link>)}</div>}
  </section>;
}
