export const validEmail = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
// GST/HST only, per merchant confirmation. CRA rates verified 2026-09-20:
// https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html
export const PROVINCES = {
  AB: ["Alberta", 5],
  BC: ["British Columbia", 5],
  MB: ["Manitoba", 5],
  NB: ["New Brunswick", 15],
  NL: ["Newfoundland and Labrador", 15],
  NS: ["Nova Scotia", 14],
  NT: ["Northwest Territories", 5],
  NU: ["Nunavut", 5],
  ON: ["Ontario", 13],
  PE: ["Prince Edward Island", 15],
  QC: ["Quebec", 5],
  SK: ["Saskatchewan", 5],
  YT: ["Yukon", 5],
} as const;
export const SHIPPING_METHODS = {
  regular: { name: "Canada Post — Regular Parcel", amount: 1500 },
  xpresspost: { name: "Canada Post — Xpresspost", amount: 2000 },
} as const;
export type Shipping = {
  email?: string;
  name: string;
  address: string;
  apartment: string;
  city: string;
  province: keyof typeof PROVINCES;
  postalCode: string;
  country: "CA";
  method: keyof typeof SHIPPING_METHODS;
};
export function parseShipping(value: unknown): Shipping | null {
  if (!value || typeof value !== "object") return null;
  const s = value as { [K in keyof Shipping]?: unknown };
  const clean = (key: keyof Shipping, max: number, optional = false) => {
    const v = s[key];
    if (optional && (v === undefined || v === "")) return "";
    return typeof v === "string" &&
      v.trim().length > 0 &&
      v.length <= max &&
      !Array.from(v).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
      ? v.trim()
      : null;
  };
  const email = clean("email", 254, true);
  if (email === null || (email && !validEmail(email))) return null;
  const name = clean("name", 100),
    address = clean("address", 200),
    apartment = clean("apartment", 100, true),
    city = clean("city", 100);
  if (
    !name ||
    !address ||
    apartment === null ||
    !city ||
    s.country !== "CA" ||
    typeof s.province !== "string" ||
    !Object.hasOwn(PROVINCES, s.province) ||
    typeof s.method !== "string" ||
    !Object.hasOwn(SHIPPING_METHODS, s.method) ||
    typeof s.postalCode !== "string"
  )
    return null;
  const postal = s.postalCode.toUpperCase().replace(/ /g, "");
  if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(postal)) return null;
  const prefixes: Record<string, string> = {
    AB: "T",
    BC: "V",
    MB: "R",
    NB: "E",
    NL: "A",
    NS: "B",
    NT: "X",
    NU: "X",
    ON: "KLMNP",
    PE: "C",
    QC: "GHJ",
    SK: "S",
    YT: "Y",
  };
  if (!prefixes[s.province]!.includes(postal[0]!)) return null;
  return {
    ...(email ? { email } : {}),
    name,
    address,
    apartment,
    city,
    province: s.province as Shipping["province"],
    postalCode: `${postal.slice(0, 3)} ${postal.slice(3)}`,
    country: "CA",
    method: s.method as Shipping["method"],
  };
}
export function shippingOrderFields(s: Shipping) {
  const method = SHIPPING_METHODS[s.method],
    rate = PROVINCES[s.province][1];
  return {
    pricing_options: { auto_apply_taxes: false, auto_apply_discounts: false },
    taxes: [
      {
        uid: "destination-tax",
        name: rate === 5 ? "GST" : "HST",
        percentage: String(rate),
        type: "ADDITIVE",
        // The merchant's flat shipping prices include the tax they will remit.
        // Apply this tax only to merchandise so checkout never adds tax above
        // the advertised $15 / $20 shipping charge.
        scope: "LINE_ITEM",
      },
    ],
    line_items: [
      {
        uid: "shipping",
        name: method.name,
        quantity: "1",
        base_price_money: { amount: method.amount, currency: "CAD" },
      },
    ],
    fulfillments: [
      {
        uid: "shipment",
        type: "SHIPMENT",
        state: "PROPOSED",
        shipment_details: {
          shipping_type: method.name,
          recipient: {
            display_name: s.name,
            ...(s.email ? { email_address: s.email } : {}),
            address: {
              address_line_1: s.address,
              address_line_2: s.apartment,
              locality: s.city,
              administrative_district_level_1: s.province,
              postal_code: s.postalCode,
              country: "CA",
            },
          },
        },
      },
    ],
  };
}

// Check Square's calculated order before exposing a payable link, and again
// before confirming payment. Fail closed if hosted checkout drops shipping.
export function hasExpectedShipping(
  order: unknown,
  expected: ReturnType<typeof shippingOrderFields>,
): boolean {
  if (!order || typeof order !== "object") return false;
  const actual = order as {
    taxes?: { percentage?: string; type?: string; scope?: string }[];
    service_charges?: {
      name?: string;
      amount_money?: { amount?: number; currency?: string };
      applied_money?: { amount?: number; currency?: string };
      total_money?: { amount?: number; currency?: string };
      total_tax_money?: { amount?: number; currency?: string };
    }[];
    line_items?: {
      uid?: string;
      quantity?: string;
      catalog_object_id?: string;
      name?: string;
      base_price_money?: { amount?: number; currency?: string };
      total_tax_money?: { amount?: number; currency?: string };
      applied_taxes?: { tax_uid?: string }[];
    }[];
    fulfillments?: {
      type?: string;
      shipment_details?: {
        shipping_type?: string;
        recipient?: { display_name?: string; address?: Record<string, unknown> };
      };
    }[];
  };
  const tax = expected.taxes[0]!,
    charge = expected.line_items.find((line) => line.uid === "shipping")!;
  const shippingLines = actual.line_items?.filter((line) => line.uid === "shipping") ?? [];
  const merchandiseLines = actual.line_items?.filter((line) => line.uid !== "shipping") ?? [];
  const actualCharge = shippingLines[0];
  if (
    actual.taxes?.length !== 1 ||
    Number(actual.taxes[0]?.percentage) !== Number(tax.percentage) ||
    actual.taxes[0]?.type !== "ADDITIVE" ||
    actual.taxes[0]?.scope !== "LINE_ITEM" ||
    // Hosted checkout adds the included-shipping profile after link creation.
    // Accept only its single, strictly zero CAD charge; reject extra charges.
    (actual.service_charges?.length ?? 0) > 1 ||
    (actual.service_charges ?? []).some(
      (fee) =>
        fee.name !== "Shipping included in order" ||
        [fee.amount_money, fee.applied_money, fee.total_money, fee.total_tax_money].some(
          (money) => money?.amount !== 0 || money.currency !== "CAD",
        ),
    ) ||
    shippingLines.length !== 1 ||
    actualCharge?.quantity !== "1" ||
    actualCharge.catalog_object_id !== undefined ||
    actualCharge?.name !== charge.name ||
    actualCharge.base_price_money?.amount !== charge.base_price_money.amount ||
    actualCharge.base_price_money.currency !== "CAD" ||
    (actualCharge.applied_taxes?.length ?? 0) !== 0 ||
    actualCharge.total_tax_money?.amount !== 0 ||
    actualCharge.total_tax_money.currency !== "CAD" ||
    merchandiseLines.length === 0 ||
    merchandiseLines.some(
      (line) =>
        line.applied_taxes?.length !== 1 || line.applied_taxes[0]?.tax_uid !== "destination-tax",
    ) ||
    actual.fulfillments?.length !== 1 ||
    actual.fulfillments[0]?.type !== "SHIPMENT" ||
    actual.fulfillments[0]?.shipment_details?.shipping_type !==
      expected.fulfillments[0]!.shipment_details.shipping_type
  )
    return false;
  const recipient = actual.fulfillments[0].shipment_details?.recipient;
  const wanted = expected.fulfillments[0]!.shipment_details.recipient;
  const normalize = (v: unknown) =>
    typeof v === "string" ? v.trim().replace(/\s+/g, " ").toUpperCase() : "";
  // Square allows contact-name edits; the charged destination must stay fixed.
  return Object.entries(wanted.address).every(
    ([key, value]) => normalize(recipient?.address?.[key]) === normalize(value),
  );
}
