import { parseCart, validAttempt, squareCheckoutUrl } from "./payment-contract.ts";
import { parseShipping, shippingOrderFields, hasExpectedShipping } from "./shipping.ts";
import { redactCheckout, verifyStoredShipping } from "./checkout-privacy.server.ts";
import { getSquareEnv, getValidSquareAccessToken, type SquareEnv } from "./square-oauth.server.ts";
import {
  boundedJson,
  checkSite,
  PaymentError,
  paymentFailure,
  paymentJson,
  sha256,
  squareJson,
} from "./square-config.server.ts";
import {
  assertMerchantLocation,
  loadStore,
  publicStore,
  variationDetails,
} from "./square-store.server.ts";

type Attempt = {
  attempt_id: string;
  cart_json: string;
  merchant_id: string;
  location_id: string;
  environment: string;
  request_json: string;
  order_id: string | null;
  checkout_url: string | null;
  created_at: number;
  paid_at: number | null;
};

async function rateLimit(request: Request, env: SquareEnv, purpose: string, limit: number) {
  if (!env.SQUARE_DB) throw new PaymentError(503, "Checkout is temporarily unavailable.");
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  // Cloudflare overwrites this header at the edge. Local development shares one bucket.
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const key = await sha256(`${purpose}:${minute}:${ip}`);
  const row = await env.SQUARE_DB.prepare(
    `INSERT INTO payment_rate_limits (bucket_key, hits, expires_at)
    VALUES (?, 1, ?) ON CONFLICT(bucket_key) DO UPDATE SET hits = hits + 1 RETURNING hits`,
  )
    .bind(key, (minute + 2) * 60_000)
    .first<{ hits: number }>();
  await env.SQUARE_DB.prepare("DELETE FROM payment_rate_limits WHERE expires_at < ?")
    .bind(now)
    .run();
  if (!row || row.hits > limit)
    throw new PaymentError(429, "Please wait a minute before trying again.");
}

async function access(env: SquareEnv) {
  const result = await getValidSquareAccessToken(env);
  if (!result.ok) {
    console.error("[square] credential check failed", { reason: result.payload["error"] });
    throw new PaymentError(503, "Square is temporarily unavailable. Please try again.");
  }
  await assertMerchantLocation(env, result.accessToken);
  return result.accessToken;
}

export async function productsHandler(request: Request, env = undefined as SquareEnv | undefined) {
  try {
    env ??= await getSquareEnv();
    const config = checkSite(request, env);
    await rateLimit(request, env, "catalog", 60);
    const token = await access(env);
    return paymentJson({ items: publicStore(await loadStore(env, token), config.locationId) });
  } catch (error) {
    return paymentFailure(error);
  }
}

export async function checkoutHandler(request: Request, env = undefined as SquareEnv | undefined) {
  try {
    env ??= await getSquareEnv();
    const config = checkSite(request, env, true);
    const body = (await boundedJson(request)) as {
      attemptId?: unknown;
      shipping?: unknown;
      expectedPrices?: unknown;
    };
    const cart = parseCart(body);
    const shipping = parseShipping(body.shipping);
    if (!shipping)
      throw new PaymentError(
        400,
        "Please enter a valid Canadian shipping address and shipping method.",
      );
    if (!cart || !validAttempt(body.attemptId))
      throw new PaymentError(400, "Your cart could not be read. Please reload and try again.");
    await rateLimit(request, env, "checkout", 12);
    const db = env.SQUARE_DB!;
    const id = body.attemptId;
    const cartJson = JSON.stringify(cart);
    const shippingFingerprint = await sha256(JSON.stringify(shipping));
    const sameShipping = (value: Attempt) =>
      JSON.parse(value.request_json)?.order?.metadata?.shipping_fingerprint === shippingFingerprint;
    const select = () =>
      db.prepare("SELECT * FROM checkout_attempts WHERE attempt_id = ?").bind(id).first<Attempt>();
    let attempt = await select();
    if (attempt && Date.now() - attempt.created_at > 86400000)
      throw new PaymentError(
        409,
        "This checkout has expired. Please start a fresh checkout from your bag.",
      );
    if (
      attempt &&
      (attempt.cart_json !== cartJson ||
        !sameShipping(attempt) ||
        attempt.merchant_id !== config.merchantId ||
        attempt.location_id !== config.locationId ||
        attempt.environment !== env.SQUARE_ENVIRONMENT)
    ) {
      throw new PaymentError(
        409,
        "This checkout belongs to a different cart. Please reload your bag.",
      );
    }
    const token = await access(env);
    if (!attempt) {
      const store = await loadStore(env, token);
      const byId = new Map(store.variations.map((v) => [v.id, v]));
      for (const line of cart) {
        const variation = byId.get(line.variationId);
        if (!variation) throw new PaymentError(409, "An item in your bag is no longer available.");
        const detail = variationDetails(variation, config.locationId, store.counts);
        if (body.expectedPrices !== undefined) {
          const prices = body.expectedPrices;
          if (
            !Array.isArray(prices) ||
            prices.length !== cart.length ||
            prices.filter(
              (price) => price?.variationId === line.variationId && price.amount === detail.amount,
            ).length !== 1
          )
            throw new PaymentError(
              409,
              "Prices changed. Please reopen your bag and review the current total.",
            );
        }
        if (!detail.inStock || (detail.quantity !== null && line.quantity > detail.quantity))
          throw new PaymentError(409, "There is not enough stock for an item in your bag.");
      }
      const paymentRequest = {
        idempotency_key: id,
        order: {
          location_id: config.locationId,
          reference_id: id,
          ...shippingOrderFields(shipping),
          line_items: [
            ...cart.map((line) => ({
              catalog_object_id: line.variationId,
              ...(byId.get(line.variationId)?.version
                ? { catalog_version: byId.get(line.variationId)!.version }
                : {}),
              quantity: String(line.quantity),
            })),
            ...shippingOrderFields(shipping).line_items,
          ],
          metadata: { shipping_fingerprint: shippingFingerprint },
        },
        checkout_options: {
          // Address and taxable shipping are already fixed on the order. Asking
          // again lets hosted checkout replace the address without repricing tax.
          ask_for_shipping_address: false,
          enable_coupon: false,
          enable_loyalty: false,
          allow_tipping: false,
          merchant_support_email: "nodoubts.ca@gmail.com",
          redirect_url: `${config.origin}/order-confirmed?attempt=${id}`,
        },
      };
      // Persist the exact request before Square can create anything. Racing callers use the winner's snapshot.
      await db
        .prepare(
          `INSERT INTO checkout_attempts
        (attempt_id, cart_json, merchant_id, location_id, environment, request_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(attempt_id) DO NOTHING`,
        )
        .bind(
          id,
          cartJson,
          config.merchantId,
          config.locationId,
          env.SQUARE_ENVIRONMENT,
          JSON.stringify(paymentRequest),
          Date.now(),
        )
        .run();
      attempt = await select();
    }
    if (
      !attempt ||
      attempt.cart_json !== cartJson ||
      !sameShipping(attempt) ||
      attempt.merchant_id !== config.merchantId ||
      attempt.location_id !== config.locationId ||
      attempt.environment !== env.SQUARE_ENVIRONMENT
    ) {
      throw new PaymentError(409, "Checkout changed. Please reload your bag.");
    }
    if (attempt.checkout_url && attempt.order_id) {
      if (!squareCheckoutUrl(attempt.checkout_url))
        throw new PaymentError(503, "Checkout is temporarily unavailable.");
      const { order } = await squareJson<{ order?: unknown }>(
        env,
        token,
        `/v2/orders/${encodeURIComponent(attempt.order_id)}`,
      );
      if (!(await verifyStoredShipping(order, attempt.request_json, env)))
        throw new PaymentError(
          503,
          "Shipping and tax could not be verified. Please contact us before paying.",
        );
      return paymentJson({ checkoutUrl: attempt.checkout_url, attemptId: id });
    }
    const result = await squareJson<{ payment_link?: { url?: string; order_id?: string } }>(
      env,
      token,
      "/v2/online-checkout/payment-links",
      JSON.parse(attempt.request_json),
    );
    if (!squareCheckoutUrl(result.payment_link?.url) || !result.payment_link?.order_id)
      throw new PaymentError(503, "Checkout could not be started. Please try again.");
    const { order: calculatedOrder } = await squareJson<{ order?: unknown }>(
      env,
      token,
      `/v2/orders/${encodeURIComponent(result.payment_link.order_id)}`,
    );
    if (!hasExpectedShipping(calculatedOrder, shippingOrderFields(shipping)))
      throw new PaymentError(
        503,
        "Shipping and tax could not be verified. Please contact us before paying.",
      );
    await db
      .prepare(
        "UPDATE checkout_attempts SET order_id = ?, checkout_url = ?, request_json = ? WHERE attempt_id = ?",
      )
      .bind(
        result.payment_link.order_id,
        result.payment_link.url,
        await redactCheckout(attempt.request_json, env),
        id,
      )
      .run();
    return paymentJson({ checkoutUrl: result.payment_link.url, attemptId: id });
  } catch (error) {
    return paymentFailure(error);
  }
}

type Money = { amount?: number; currency?: string };
type Order = {
  id?: string;
  location_id?: string;
  reference_id?: string;
  state?: string;
  total_money?: Money;
  net_amount_due_money?: Money;
  line_items?: { uid?: string; catalog_object_id?: string; quantity?: string }[];
  tenders?: { id?: string; payment_id?: string }[];
};
type Payment = {
  id?: string;
  order_id?: string;
  location_id?: string;
  status?: string;
  total_money?: Money;
  refunded_money?: Money;
};

export async function statusHandler(request: Request, env = undefined as SquareEnv | undefined) {
  try {
    env ??= await getSquareEnv();
    const config = checkSite(request, env);
    const id = new URL(request.url).searchParams.get("attempt");
    if (!validAttempt(id)) return paymentJson({ status: "unknown" }, 404);
    await rateLimit(request, env, "status", 60);
    const attempt = await env
      .SQUARE_DB!.prepare("SELECT * FROM checkout_attempts WHERE attempt_id = ?")
      .bind(id)
      .first<Attempt>();
    if (
      !attempt ||
      attempt.merchant_id !== config.merchantId ||
      attempt.location_id !== config.locationId ||
      attempt.environment !== env.SQUARE_ENVIRONMENT
    )
      return paymentJson({ status: "unknown" }, 404);
    if (!attempt.order_id) return paymentJson({ status: "pending" });
    const token = await access(env);
    const { order } = await squareJson<{ order?: Order }>(
      env,
      token,
      `/v2/orders/${encodeURIComponent(attempt.order_id)}`,
    );
    if (
      !order ||
      order.id !== attempt.order_id ||
      order.location_id !== config.locationId ||
      order.reference_id !== id
    )
      throw new PaymentError(
        503,
        "Payment could not be verified. Please contact us before paying again.",
      );
    if (order.state === "CANCELED") return paymentJson({ status: "canceled" });
    const savedRequest = JSON.parse(attempt.request_json);
    if (!(await verifyStoredShipping(order, attempt.request_json, env)))
      throw new PaymentError(
        503,
        "Shipping and tax could not be verified. Please contact us before paying again.",
      );
    const orderCart = parseCart({
      items: order.line_items
        ?.filter(
          (line) => !(savedRequest.order.metadata?.shipping_fingerprint && line.uid === "shipping"),
        )
        .map((line) => ({
          variationId: line.catalog_object_id,
          quantity: Number(line.quantity),
        })),
    });
    if (JSON.stringify(orderCart) !== attempt.cart_json)
      throw new PaymentError(
        503,
        "Payment could not be verified. Please contact us before paying again.",
      );
    const total = order.total_money;
    if (
      !Number.isSafeInteger(total?.amount) ||
      (total?.amount ?? 0) <= 0 ||
      total?.currency !== "CAD" ||
      order.net_amount_due_money?.amount !== 0 ||
      order.net_amount_due_money.currency !== "CAD"
    )
      return paymentJson({ status: "pending" });
    const paymentIds = [
      ...new Set(
        (order.tenders ?? [])
          .map((t) => t.payment_id ?? t.id)
          .filter((p): p is string => Boolean(p)),
      ),
    ];
    if (!paymentIds.length || paymentIds.length > 10) return paymentJson({ status: "pending" });
    let paid = 0;
    let refunded = 0;
    for (const paymentId of paymentIds) {
      const { payment } = await squareJson<{ payment?: Payment }>(
        env,
        token,
        `/v2/payments/${encodeURIComponent(paymentId)}`,
      );
      if (
        !payment ||
        payment.id !== paymentId ||
        payment.order_id !== order.id ||
        payment.location_id !== config.locationId ||
        payment.status !== "COMPLETED" ||
        payment.total_money?.currency !== "CAD" ||
        !Number.isSafeInteger(payment.total_money.amount) ||
        (payment.total_money.amount ?? 0) <= 0
      )
        return paymentJson({ status: "pending" });
      paid += payment.total_money.amount!;
      if (payment.refunded_money) {
        if (
          payment.refunded_money.currency !== "CAD" ||
          !Number.isSafeInteger(payment.refunded_money.amount) ||
          (payment.refunded_money.amount ?? -1) < 0
        )
          throw new PaymentError(503, "Payment could not be verified.");
        refunded += payment.refunded_money.amount!;
      }
    }
    if (refunded > 0) return paymentJson({ status: "refunded" });
    if (paid !== total!.amount) return paymentJson({ status: "pending" });
    await env
      .SQUARE_DB!.prepare("UPDATE checkout_attempts SET paid_at = ? WHERE attempt_id = ?")
      .bind(Date.now(), id)
      .run();
    // Return only status and the caller's original cart; never customer/payment records.
    return paymentJson({ status: "paid", cart: JSON.parse(attempt.cart_json) });
  } catch (error) {
    return paymentFailure(error);
  }
}
