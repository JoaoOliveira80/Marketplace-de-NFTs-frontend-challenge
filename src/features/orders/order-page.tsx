import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { clearOrderIntent, orderQueryOptions, type Order } from "./order-api";

function Receipt({ order }: { order: Order }) {
  const { quote } = order.receipt;
  return <div className="order-receipt">
    <div className="order-receipt__icon" aria-hidden="true"><CheckCircle size={64} weight="thin" /></div>
    <h1>Seus NFTs agora estão na sua carteira</h1>
    <div className="order-receipt__facts">
      <div><strong>ID da transação</strong><span>{order.transactionId?.slice(0, 8)}...{order.transactionId?.slice(-4)}</span></div>
      <div><strong>Data</strong><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(order.createdAt))}</span></div>
      <div><strong>Total</strong><span>{quote.totalEth} ETH</span></div>
      <div><strong>Carteira</strong><span>{order.receipt.walletName}</span></div>
    </div>
    <div className="order-receipt__body">
      <h2>Detalhes da transação</h2>
      <div className="order-receipt__head"><span>NFTs</span><span>Edições</span><span>Subtotal</span></div>
      {quote.items.map((item) => <div className="order-receipt__item" key={`${item.nftId}:${item.editionId}`}>
        <img src={item.image} alt="" />
        <div><strong>{item.name} #{item.tokenId}</strong><small>ID do token: #{item.tokenId}</small></div>
        <span>(x {item.quantity})</span><b>{item.lineTotalEth} ETH</b>
      </div>)}
      <div className="order-receipt__totals"><span>Subtotal</span><span>{quote.subtotalEth} ETH</span><span>Desconto</span><span>(-) {quote.discountEth} ETH</span><span>Taxa de rede</span><span>{quote.networkFeeEth} ETH</span><strong>Total</strong><b>{quote.totalEth} ETH</b></div>
      <p>Transação confirmada na rede {order.receipt.network}. A propriedade foi transferida para {order.receipt.walletAddress} na simulação.</p>
      <p className="order-receipt__reference">Referência simulada: {order.transactionId}</p>
      <Link to="/">Continuar explorando</Link>
    </div>
  </div>;
}

export function OrderPage({ orderId }: { orderId: string }) {
  const session = useQuery(sessionQueryOptions);
  const userId = session.data?.user?.id ?? "";
  const queryClient = useQueryClient();
  const order = useQuery({ ...orderQueryOptions(userId, orderId), enabled: Boolean(userId) });

  useEffect(() => {
    if (order.data && order.data.status !== "pending" && userId) clearOrderIntent(userId);
    if (order.data?.status === "confirmed") {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["cart-quote"] });
    }
  }, [order.data, queryClient, userId]);

  if (order.isPending || !session.data?.user) return <section className="order-page"><div className="order-state" role="status">Carregando pedido...</div></section>;
  if (order.isError) return <section className="order-page"><div className="order-state" role="alert"><WarningCircle size={42} /><h1>Não foi possível consultar o pedido</h1><p>Confira sua conexão e tente novamente. Um novo pedido não será criado.</p><button onClick={() => void order.refetch()}>Tentar novamente</button><Link to="/checkout">Voltar ao pagamento</Link></div></section>;
  if (order.data.status === "pending") return <section className="order-page"><div className="order-state" role="status"><Clock size={48} /><h1>Pedido em andamento</h1><p>Estamos aguardando a confirmação do pagamento. Você pode recarregar esta página sem criar outro pedido.</p><small>Pedido {order.data.id}</small><button onClick={() => void order.refetch()}>Atualizar estado</button></div></section>;
  if (order.data.status === "refused") return <section className="order-page"><div className="order-state" role="alert"><WarningCircle size={48} /><h1>Pagamento recusado</h1><p>Nenhum item foi removido do carrinho. Revise a carteira ou tente novamente.</p><small>Pedido {order.data.id}</small><Link to="/checkout">Voltar ao pagamento</Link></div></section>;
  return <section className="order-page"><Receipt order={order.data} /></section>;
}
