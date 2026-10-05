import { http, HttpResponse } from "msw";
import { queryClient } from "@/app/query-client";
import { clearRealtimeScenarioTimers } from "./realtime-handlers";
import { resetMockState } from "./reset-state";

export const resetHandlers = [
  http.post("/api/mock/reset", () => {
    clearRealtimeScenarioTimers();
    resetMockState();
    queryClient.clear();
    window.dispatchEvent(new Event("kurio:session-cleared"));
    return HttpResponse.json({ reset: true });
  }),
];

