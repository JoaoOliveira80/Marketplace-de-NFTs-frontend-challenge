import { setupWorker } from "msw/browser";
import { catalogHandlers } from "./catalog-handlers";

export const worker = setupWorker(...catalogHandlers);
