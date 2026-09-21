/* eslint-disable @typescript-eslint/no-explicit-any -- Deliberately malformed external API fixtures exercise validation. */
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  checkoutHandler,
  productsHandler,
  statusHandler,
} from "../src/lib/payment-handlers.server.ts";
import { disabledSquareConnection } from "../src/lib/square-connection.server.ts";
import {
  encryptToken,
  importEncryptionKey,
  getValidSquareAccessToken,
  type SquareEnv,
  type D1Database,
} from "../src/lib/square-oauth.server.ts";
import { parseCart, squareCheckoutUrl } from "../src/lib/payment-contract.ts";
import { checkoutAttempt } from "../src/lib/checkout-attempt.ts";
import { hasExpectedShipping } from "../src/lib/shipping.ts";
import {
  parseShipping,
  shippingOrderFields,
  PROVINCES,
  SHIPPING_METHODS,
} from "../src/lib/shipping.ts";
import type { CatalogObject } from "../src/lib/square-store.server.ts";
import { squareJson, PaymentError } from "../src/lib/square-config.server.ts";

let sql: DatabaseSync;
let env: SquareEnv;
const realFetch = globalThis.fetch;
let calls: { url: URL; body: Record<string, any>; authorization: string | null }[];
let objects: CatalogObject[];
let stock: { catalog_object_id: string; location_id: string; state: string; quantity: string }[];
let order: Record<string, any>;
let payment: Record<string, any>;
let loseResponse: boolean;
let apiFailure: string | null;
let locationMerchant: string;
const origin = "https://test.example";
const item = { variationId: "variation-m", quantity: 1 };
const shipping = {
  name: "Test Buyer",
  address: "1 Test Street",
  apartment: "",
  city: "Toronto",
  province: "ON",
  postalCode: "M5V 1A1",
  country: "CA",
  method: "regular",
};
const dbAdapter = (): D1Database => ({
  prepare(query) {
    let args: any[] = [];
    const statement = {
      bind(...values: unknown[]) {
        args = values;
        return statement;
      },
      async first<T>() {
        return (sql.prepare(query).get(...args) ?? null) as T | null;
      },
      async run() {
        const result = sql.prepare(query).run(...args);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
    return statement;
  },
});

async function addToken(
  merchant = "merchant",
  expiry = new Date(Date.now() + 10 * 86400000).toISOString(),
) {
  const key = await importEncryptionKey(env.SQUARE_TOKEN_ENCRYPTION_KEY!);
  const access = await encryptToken(key, `token-${merchant}`);
  const refresh = await encryptToken(key, "refresh-secret");
  sql
    .prepare(
      `INSERT OR REPLACE INTO square_oauth_tokens VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(merchant, access.ciphertext, access.iv, refresh.ciphertext, refresh.iv, expiry);
}

beforeEach(async () => {
  sql = new DatabaseSync(":memory:");
  sql.exec(
    readFileSync(new URL("../migrations/0001_payment_attempts.sql", import.meta.url), "utf8"),
  );
  sql.exec(`CREATE TABLE square_oauth_tokens (merchant_id TEXT PRIMARY KEY, access_token_ciphertext TEXT,
    access_token_iv TEXT, refresh_token_ciphertext TEXT, refresh_token_iv TEXT, expires_at TEXT, updated_at TEXT)`);
  env = {
    SQUARE_APP_ID: "test-app",
    SQUARE_APP_SECRET: "test-secret",
    SQUARE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    SQUARE_LOCATION_ID: "location",
    SQUARE_DB: dbAdapter(),
    SQUARE_MERCHANT_ID: "merchant",
    SQUARE_ENVIRONMENT: "sandbox",
    PUBLIC_SITE_URL: origin,
  };
  await addToken();
  calls = [];
  loseResponse = false;
  apiFailure = null;
  locationMerchant = "merchant";
  objects = [
    {
      id: "item",
      type: "ITEM",
      item_data: {
        name: "Earn Your Total",
        variations: [
          {
            id: "variation-m",
            type: "ITEM_VARIATION",
            item_variation_data: {
              item_id: "item",
              name: "M",
              track_inventory: true,
              price_money: { amount: 3000, currency: "CAD" },
            },
          },
          {
            id: "variation-3xl",
            type: "ITEM_VARIATION",
            item_variation_data: {
              item_id: "item",
              name: "3XL",
              track_inventory: false,
              price_money: { amount: 3000, currency: "CAD" },
            },
          },
        ],
      },
    },
  ];
  stock = [
    { catalog_object_id: "variation-m", location_id: "location", state: "IN_STOCK", quantity: "3" },
  ];
  order = {
    id: "order",
    location_id: "location",
    reference_id: "",
    state: "OPEN",
    total_money: { amount: 3390, currency: "CAD" },
    net_amount_due_money: { amount: 0, currency: "CAD" },
    line_items: [{ catalog_object_id: "variation-m", quantity: "1" }],
    tenders: [{ payment_id: "payment" }],
  };
  payment = {
    id: "payment",
    order_id: "order",
    location_id: "location",
    status: "COMPLETED",
    total_money: { amount: 3390, currency: "CAD" },
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, body, authorization: new Headers(init?.headers).get("authorization") });
    assert.equal(
      url.origin,
      "https://connect.squareupsandbox.com",
      "tests must never contact production",
    );
    if (apiFailure && url.pathname.includes(apiFailure))
      return Response.json({ error: "simulated" }, { status: 403 });
    if (url.pathname === "/v2/locations/location")
      return Response.json({
        location: {
          id: "location",
          merchant_id: locationMerchant,
          currency: "CAD",
          status: "ACTIVE",
        },
      });
    if (url.pathname === "/v2/catalog/list") return Response.json({ objects });
    if (url.pathname === "/v2/inventory/counts/batch-retrieve") {
      assert.deepEqual(body.location_ids, ["location"]);
      return Response.json({ counts: stock });
    }
    if (url.pathname === "/v2/online-checkout/payment-links") {
      order.reference_id = body.order.reference_id;
      order.taxes = body.order.taxes;
      order.fulfillments = body.order.fulfillments;
      order.line_items = body.order.line_items.map((charge: any) => ({
        ...charge,
        total_tax_money: {
          amount: Math.round(
            ((charge.base_price_money?.amount ?? 3000) * Number(body.order.taxes[0].percentage)) /
              100,
          ),
          currency: "CAD",
        },
      }));
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Simulated lost response after creation");
      }
      return Response.json({
        payment_link: { url: "https://sandbox.square.link/u/example", order_id: "order" },
      });
    }
    if (url.pathname === "/v2/orders/order") return Response.json({ order });
    if (url.pathname === "/v2/payments/payment") return Response.json({ payment });
    if (url.pathname === "/oauth2/token")
      return Response.json({
        access_token: "new-token",
        refresh_token: "new-refresh",
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    throw new Error(`Unexpected test request: ${url.pathname}`);
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  sql.close();
});

function checkout(
  attemptId = crypto.randomUUID(),
  items: unknown[] = [item],
  extra = {},
  requestOrigin = origin,
) {
  return checkoutHandler(
    new Request(`${origin}/api/square/checkout`, {
      method: "POST",
      headers: { origin: requestOrigin, "content-type": "application/json" },
      body: JSON.stringify({ attemptId, items, shipping, ...extra }),
    }),
    env,
  );
}
function status(id: string) {
  return statusHandler(new Request(`${origin}/api/square/status?attempt=${id}`), env);
}
const created = () => calls.filter((call) => call.url.pathname.endsWith("payment-links"));

test("public OAuth endpoints are disabled and do not call Square", () => {
  assert.equal(disabledSquareConnection().status, 410);
  assert.equal(calls.length, 0);
});
test("prices come from catalog references; injected totals are ignored", async () => {
  const response = await checkout(undefined, [{ ...item, priceAmount: 1 }], { total: 1 });
  assert.equal(response.status, 200);
  assert.deepEqual(
    created()[0]!.body.order.line_items.filter((line: any) => line.uid !== "shipping"),
    [{ catalog_object_id: "variation-m", quantity: "1" }],
  );
  assert.equal(created()[0]!.body.order.pricing_options.auto_apply_taxes, false);
});

test("shipping is charged once and receives explicit destination tax", async () => {
  for (const method of ["regular", "xpresspost"] as const) {
    assert.equal(
      (
        await checkout(undefined, [item], {
          shipping: { ...shipping, method },
          shippingAmount: 1,
          taxRate: 0,
        })
      ).status,
      200,
    );
    const request = created().at(-1)!.body;
    const charge = request.order.line_items.find((line: any) => line.uid === "shipping");
    assert.equal(charge.base_price_money.amount, SHIPPING_METHODS[method].amount);
    assert.equal(charge.quantity, "1");
    assert.equal(request.order.service_charges, undefined);
    assert.equal(request.order.taxes[0].percentage, "13");
    assert.equal(request.order.taxes[0].scope, "ORDER");
    assert.equal(request.checkout_options.ask_for_shipping_address, false);
    assert.equal(request.checkout_options.shipping_fee, undefined);
    assert.equal(request.order.fulfillments[0].type, "SHIPMENT");
    assert.equal(request.order.fulfillments[0].shipment_details.recipient.address.country, "CA");
  }
});

test("GST/HST rates cover all destinations and tax both shipping options", () => {
  const expected = {
    AB: 5,
    BC: 5,
    MB: 5,
    NB: 15,
    NL: 15,
    NS: 14,
    NT: 5,
    NU: 5,
    ON: 13,
    PE: 15,
    QC: 5,
    SK: 5,
    YT: 5,
  };
  for (const [province, rate] of Object.entries(expected)) {
    assert.equal(PROVINCES[province as keyof typeof PROVINCES][1], rate);
    const fields = shippingOrderFields({ ...shipping, province } as any);
    assert.equal(fields.taxes[0]!.percentage, String(rate));
    assert.equal(fields.taxes.length, 1);
  }
  assert.equal(Math.round((6000 + 1500) * 1.13), 8475);
  assert.equal(Math.round((6000 + 2000) * 1.13), 9040);
});

test("invalid, foreign, or mismatched destinations cannot create payment links", async () => {
  for (const invalid of [
    undefined,
    {},
    { ...shipping, country: "US" },
    { ...shipping, province: "XX" },
    { ...shipping, province: "BC" },
    { ...shipping, postalCode: "12345" },
    { ...shipping, method: "free" },
    { ...shipping, name: "" },
  ]) {
    assert.equal((await checkout(undefined, [item], { shipping: invalid })).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal(parseShipping({ ...shipping, postalCode: "m5v1a1" })?.postalCode, "M5V 1A1");
});

test("retry cannot reuse an order after its shipping method or address changes", async () => {
  const id = crypto.randomUUID();
  assert.equal((await checkout(id)).status, 200);
  assert.equal(
    (await checkout(id, [item], { shipping: { ...shipping, method: "xpresspost" } })).status,
    409,
  );
  assert.equal(
    (await checkout(id, [item], { shipping: { ...shipping, address: "2 Test Street" } })).status,
    409,
  );
  assert.equal(created().length, 1);
});
test("shipping verification rejects missing tax, duplicate fees and changed destination", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  const expected = shippingOrderFields(parseShipping(shipping)!);
  assert.equal(hasExpectedShipping(order, expected), true);
  const contactEdit = structuredClone(order);
  contactEdit.fulfillments[0].shipment_details.recipient.display_name = "Updated contact";
  assert.equal(hasExpectedShipping(contactEdit, expected), true);
  for (const mutate of [
    (o: any) => {
      o.line_items.find((l: any) => l.uid === "shipping").total_tax_money.amount = 0;
    },
    (o: any) => {
      o.line_items.find((l: any) => l.uid === "shipping").quantity = "2";
    },
    (o: any) => {
      o.service_charges = [{ amount_money: { amount: 1500, currency: "CAD" } }];
    },
    (o: any) => {
      o.fulfillments[0].shipment_details.recipient.address.country = "US";
    },
    (o: any) => {
      o.fulfillments[0].shipment_details.shipping_type = "Different method";
    },
    (o: any) => {
      o.taxes[0].percentage = "5";
    },
  ]) {
    const modified = structuredClone(order);
    mutate(modified);
    assert.equal(hasExpectedShipping(modified, expected), false);
  }
  order.line_items.find((l: any) => l.uid === "shipping").total_tax_money.amount = 0;
  assert.equal((await status(id)).status, 503);
});

test("hosted checkout accepts only the single zero CAD included-shipping fee", async () => {
  await checkout(crypto.randomUUID());
  const expected = shippingOrderFields(parseShipping(shipping)!);
  const zero = { amount: 0, currency: "CAD" };
  const fee = {
    name: "Shipping included in order",
    amount_money: zero,
    applied_money: zero,
    total_money: zero,
    total_tax_money: zero,
  };
  order.service_charges = [structuredClone(fee)];
  assert.equal(hasExpectedShipping(order, expected), true);
  for (const field of ["amount_money", "applied_money", "total_money", "total_tax_money"]) {
    const changed = structuredClone(order);
    changed.service_charges[0][field].amount = 1;
    assert.equal(hasExpectedShipping(changed, expected), false);
    changed.service_charges[0][field] = { amount: 0, currency: "USD" };
    assert.equal(hasExpectedShipping(changed, expected), false);
    delete changed.service_charges[0][field];
    assert.equal(hasExpectedShipping(changed, expected), false);
  }
  order.service_charges = [fee, fee];
  assert.equal(hasExpectedShipping(order, expected), false);
  order.service_charges = [{ ...fee, name: "Unexpected fee" }];
  assert.equal(hasExpectedShipping(order, expected), false);
});

test("browser retries bind to address and shipping without storing the raw address", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  const a = checkoutAttempt([item], storage, "address-digest-a");
  assert.equal(checkoutAttempt([item], storage, "address-digest-a").attemptId, a.attemptId);
  assert.notEqual(checkoutAttempt([item], storage, "address-digest-b").attemptId, a.attemptId);
  assert.equal([...values.values()].join("").includes(shipping.address), false);
});

test("invalid quantities and duplicate merged quantity limits fail before any API call", async () => {
  for (const quantity of [0, -1, 1.5, 11, "1", null])
    assert.equal(
      (await checkout(undefined, [{ variationId: "variation-m", quantity }])).status,
      400,
    );
  assert.equal(
    (
      await checkout(undefined, [
        { ...item, quantity: 6 },
        { ...item, quantity: 5 },
      ])
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
});
test("empty or oversized carts and malformed IDs are rejected", () => {
  assert.equal(parseCart({ items: [] }), null);
  assert.equal(parseCart({ items: Array(21).fill(item) }), null);
  assert.equal(parseCart({ items: [{ variationId: "../secret", quantity: 1 }] }), null);
});
test("cross-origin checkout is rejected", async () => {
  assert.equal((await checkout(undefined, [item], {}, "https://attacker.example")).status, 403);
  assert.equal(calls.length, 0);
});
test("preview host cannot call production or refresh its credentials", async () => {
  const response = await checkoutHandler(
    new Request("https://preview.example/api/square/checkout", { method: "POST" }),
    env,
  );
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});
test("missing environment fails closed with no production fallback", async () => {
  env.SQUARE_ENVIRONMENT = undefined;
  assert.equal((await checkout()).status, 503);
  assert.equal(calls.length, 0);
});
test("missing token does not use another merchant's latest token", async () => {
  sql.exec("DELETE FROM square_oauth_tokens");
  await addToken("other");
  assert.equal((await checkout()).status, 503);
  assert.equal(calls.length, 0);
});
test("configured merchant is selected even if another row is newer", async () => {
  await addToken("other");
  sql
    .prepare("UPDATE square_oauth_tokens SET updated_at='2099-01-01' WHERE merchant_id='other'")
    .run();
  assert.equal((await checkout()).status, 200);
  assert.ok(calls.every((call) => call.authorization === "Bearer token-merchant"));
});
test("wrong merchant/location pairing blocks checkout", async () => {
  locationMerchant = "other";
  assert.equal((await checkout()).status, 503);
  assert.equal(created().length, 0);
});
test("expired credentials refresh and updated encrypted token is persisted", async () => {
  await addToken("merchant", new Date(Date.now() - 1000).toISOString());
  const result = await getValidSquareAccessToken(env);
  assert.equal(result.ok, true);
  assert.equal(calls.filter((c) => c.url.pathname === "/oauth2/token").length, 1);
  const again = await getValidSquareAccessToken(env);
  assert.deepEqual(again, result);
  assert.equal(calls.length, 1);
});
test("refresh failure never returns an expired token", async () => {
  await addToken("merchant", new Date(Date.now() - 1000).toISOString());
  apiFailure = "/oauth2/token";
  assert.equal((await checkout()).status, 503);
  assert.equal(created().length, 0);
});
test("concurrent refresh lease prevents a second expired-token refresh", async () => {
  await addToken("merchant", new Date(Date.now() - 1000).toISOString());
  sql
    .prepare("INSERT INTO square_refresh_locks VALUES (?, ?, ?)")
    .run("merchant", "someone-else", Date.now() + 60000);
  assert.equal((await getValidSquareAccessToken(env)).ok, false);
  assert.equal(calls.length, 0);
});
test("hidden sizes, unknown variations and unpublished catalog items cannot be purchased", async () => {
  objects.push({
    id: "private",
    type: "ITEM",
    item_data: {
      name: "Private item",
      variations: [
        {
          id: "private-variation",
          item_variation_data: { name: "M", price_money: { amount: 1, currency: "CAD" } },
        },
      ],
    },
  });
  for (const id of ["variation-3xl", "unknown", "private-variation"])
    assert.equal((await checkout(undefined, [{ variationId: id, quantity: 1 }])).status, 409);
  assert.equal(created().length, 0);
});
test("duplicate approved product names fail closed", async () => {
  objects.push({ ...objects[0]!, id: "ambiguous" });
  assert.equal((await checkout()).status, 503);
});
test("tracked missing inventory and insufficient inventory reject checkout", async () => {
  stock = [];
  assert.equal((await checkout()).status, 409);
  stock = [
    { catalog_object_id: "variation-m", location_id: "location", state: "IN_STOCK", quantity: "1" },
  ];
  assert.equal((await checkout(undefined, [{ ...item, quantity: 2 }])).status, 409);
});
test("other-location inventory cannot override the configured location", async () => {
  stock.push({
    catalog_object_id: "variation-m",
    location_id: "other",
    state: "IN_STOCK",
    quantity: "99",
  });
  const response = await productsHandler(new Request(`${origin}/api/square/products`), env);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.items[0].variations.length, 1);
  assert.equal(data.items[0].variations[0].inventoryQuantity, 3);
});
test("parent location restrictions and sold-out overrides are enforced", async () => {
  objects[0]!.absent_at_location_ids = ["location"];
  assert.equal((await checkout()).status, 409);
  delete objects[0]!.absent_at_location_ids;
  objects[0]!.item_data!.variations![0]!.item_variation_data!.location_overrides = [
    { location_id: "location", sold_out: true },
  ];
  assert.equal((await checkout()).status, 409);
});
test("repeated request returns the same link without creating another order", async () => {
  const id = crypto.randomUUID();
  const first = await checkout(id);
  const second = await checkout(id);
  assert.deepEqual(await first.json(), await second.json());
  assert.equal(created().length, 1);
});
test("lost response retry reuses exact stored Square request and key", async () => {
  const id = crypto.randomUUID();
  loseResponse = true;
  assert.equal((await checkout(id)).status, 503);
  assert.equal((await checkout(id)).status, 200);
  assert.equal(created().length, 2);
  assert.deepEqual(created()[0]!.body, created()[1]!.body);
  assert.equal(created()[0]!.body.idempotency_key, id);
});
test("concurrent same-attempt calls use the same Square idempotency request", async () => {
  const id = crypto.randomUUID();
  const responses = await Promise.all([checkout(id), checkout(id)]);
  assert.ok(responses.every((r) => r.status === 200));
  assert.ok(created().every((c) => JSON.stringify(c.body) === JSON.stringify(created()[0]!.body)));
  assert.equal(sql.prepare("SELECT count(*) AS count FROM checkout_attempts").get()!.count, 1);
});
test("reusing an attempt ID with a modified cart is rejected", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  assert.equal((await checkout(id, [{ ...item, quantity: 2 }])).status, 409);
  assert.equal(created().length, 1);
});
test("rate limits bound repeated link creation", async () => {
  for (let i = 0; i < 12; i++) assert.equal((await checkout()).status, 200);
  assert.equal((await checkout()).status, 429);
  assert.equal(created().length, 12);
});
test("large bodies are rejected even without content-length", async () => {
  const response = await checkoutHandler(
    new Request(`${origin}/api/square/checkout`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ junk: "x".repeat(9000) }),
    }),
    env,
  );
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});
test("direct confirmation without a known attempt never confirms a payment", async () => {
  assert.equal((await status("invalid")).status, 404);
  assert.equal((await status(crypto.randomUUID())).status, 404);
});
test("fully captured matching payment confirms even while fulfillment order is OPEN", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  const response = await status(id);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "paid", cart: [item] });
});
test("authorized but uncaptured payment is not confirmed", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  payment.status = "APPROVED";
  assert.equal((await (await status(id)).json()).status, "pending");
});
test("missing permission or Square outage does not become success", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  apiFailure = "/payments/";
  assert.equal((await status(id)).status, 503);
});
test("mismatched amount, currency or payment order cannot confirm", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  payment.total_money.amount = 1;
  assert.equal((await (await status(id)).json()).status, "pending");
  payment.total_money.amount = 3390;
  payment.total_money.currency = "USD";
  assert.equal((await (await status(id)).json()).status, "pending");
  payment.total_money.currency = "CAD";
  payment.order_id = "other";
  assert.equal((await (await status(id)).json()).status, "pending");
});
test("tampered order reference or item cannot confirm", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  order.reference_id = "other";
  assert.equal((await status(id)).status, 503);
  order.reference_id = id;
  order.line_items[0].quantity = "2";
  assert.equal((await status(id)).status, 503);
});
test("refunds are shown as refunded rather than paid", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  payment.refunded_money = { amount: 100, currency: "CAD" };
  assert.equal((await (await status(id)).json()).status, "refunded");
});
test("canceled and unpaid orders are not confirmed", async () => {
  const id = crypto.randomUUID();
  await checkout(id);
  order.state = "CANCELED";
  assert.equal((await (await status(id)).json()).status, "canceled");
  order.state = "OPEN";
  order.net_amount_due_money.amount = 3390;
  assert.equal((await (await status(id)).json()).status, "pending");
});
test("client attempt survives retry and changes with cart", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const first = checkoutAttempt([item], storage);
  assert.deepEqual(checkoutAttempt([item], storage), first);
  assert.notEqual(checkoutAttempt([{ ...item, quantity: 2 }], storage).attemptId, first.attemptId);
});
test("redirect URLs are limited to exact Square HTTPS hosts", () => {
  assert.equal(squareCheckoutUrl("https://checkout.square.site/merchant/order"), true);
  for (const value of [
    "javascript:alert(1)",
    "http://square.link/u/a",
    "https://square.link.attacker.example/a",
    "https://attacker@square.link/a",
    "https://square.link:999/a",
  ])
    assert.equal(squareCheckoutUrl(value), false);
});

test("Square API redirects are not followed with merchant credentials", async () => {
  let requests = 0;
  globalThis.fetch = async (_input, init) => {
    requests += 1;
    assert.equal(init?.redirect, "manual");
    return new Response(null, { status: 302, headers: { location: "https://attacker.example" } });
  };
  await assert.rejects(squareJson(env, "test-token", "/v2/locations/location"), PaymentError);
  assert.equal(requests, 1);
});
