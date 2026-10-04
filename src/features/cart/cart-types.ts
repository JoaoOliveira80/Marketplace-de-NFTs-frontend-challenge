export interface CartItem {
  nftId: string;
  editionId: string;
  quantity: number;
}

export interface CartResponse {
  items: CartItem[];
  coupon: string | null;
}

export interface QuotedItem extends CartItem {
  name: string;
  tokenId: string;
  image: string;
  edition: string;
  unitPriceEth: string;
  lineTotalEth: string;
  available: number;
}

export interface CartQuote {
  revision: string;
  items: QuotedItem[];
  coupon: string | null;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  valid: boolean;
  issues: string[];
}
