export interface NftUpdatedEvent {
  eventId: string;
  nftId: string;
  editionId: string;
  version: number;
  priceEth: string;
  available: number;
}

export interface OrderUpdatedEvent {
  eventId: string;
  orderId: string;
  userId: string;
  version: number;
  status: "confirmed" | "refused";
}
