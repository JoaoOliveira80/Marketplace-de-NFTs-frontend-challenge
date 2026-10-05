import { setupWorker } from "msw/browser";
import { catalogHandlers } from "./catalog-handlers";
import { accountHandlers } from "./account-handlers";
import { cartHandlers } from "./cart-handlers";
import { walletHandlers } from "./wallet-handlers";
import { orderHandlers } from "./order-handlers";
import { realtimeHandlers } from "./realtime-handlers";

export const worker = setupWorker(...catalogHandlers, ...accountHandlers, ...cartHandlers, ...walletHandlers, ...orderHandlers, ...realtimeHandlers);
