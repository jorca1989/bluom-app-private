import { httpRouter } from "convex/server";
import { handleClerkWebhook } from "./httpHandlers";
import { handleWebhook } from "./revenuecat";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: handleWebhook,
});

export default http;
