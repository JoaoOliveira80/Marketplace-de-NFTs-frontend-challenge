import { setupWorker } from "msw/browser";
import { catalogHandlers } from "./catalog-handlers";
import { accountHandlers } from "./account-handlers";

export const worker = setupWorker(...catalogHandlers, ...accountHandlers);
