import {
  PROVINCES,
  SHIPPING_METHODS,
  pickupEvent,
  PICKUP_INSTRUCTIONS,
  type Shipping,
} from "@/lib/shipping";

export type ShippingDraft = Omit<Shipping, "province"> & { province: Shipping["province"] | "" };
export const emptyShipping: ShippingDraft = {
  name: "",
  email: "",
  address: "",
  apartment: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA",
  method: "regular",
};
export function ShippingFields({
  value,
  onChange,
  disabled,
}: {
  value: ShippingDraft;
  onChange: (value: ShippingDraft) => void;
  disabled: boolean;
}) {
  const style = "mt-1 w-full rounded-none border border-border bg-ink px-3 py-2 text-sm text-bone";
  const event = pickupEvent(value.method);
  const fields = [
    ["name", "Full name", "name", 100],
    ["email", "Email for order updates", "email", 254],
    ["address", "Street address", "shipping address-line1", 200],
    ["apartment", "Apartment / suite (optional)", "shipping address-line2", 100],
    ["city", "City", "shipping address-level2", 100],
    ["postalCode", "Postal code", "shipping postal-code", 7],
  ] as const;
  return (
    <fieldset disabled={disabled} className="mt-6 space-y-3 border-t border-border pt-4">
      <legend className="display pt-4 text-lg text-bone">Shipping or event pickup</legend>
      <fieldset className="space-y-2 text-sm text-bone">
        <legend className="mb-2">Delivery option — choose one</legend>
        {Object.entries(SHIPPING_METHODS).map(([code, method]) => {
          const pickup = pickupEvent(code);
          const expired = pickup && Date.now() >= Date.parse(pickup.closesAt);
          return (
            <label
              key={code}
              className={`flex items-start gap-3 border p-3 ${
                value.method === code ? "border-bone bg-bone/5" : "border-border"
              } ${disabled || expired ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="delivery-method"
                value={code}
                checked={value.method === code}
                disabled={!!expired}
                onChange={() => onChange({ ...value, method: code as Shipping["method"] })}
                className="mt-0.5 size-4 shrink-0 accent-bone"
              />
              <span className="min-w-0 flex-1">
                {method.name}
                {expired ? " (Ended)" : ""}
              </span>
              <span className="shrink-0 font-semibold">
                {method.amount === 0 ? "Free" : `$${method.amount / 100}`}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="text-xs text-muted-foreground">
        {event
          ? PICKUP_INSTRUCTIONS
          : "Enter the delivery address here so we can calculate shipping and GST/HST before payment."}
      </p>
      {event && (
        <p className="text-xs text-muted-foreground">
          Ontario event pickup. No shipping fee. Merchandise plus 13% HST.
        </p>
      )}
      {fields
        .filter(([key]) => !event || key === "name" || key === "email")
        .map(([key, label, autoComplete, maxLength]) => (
          <label key={key} className="block text-sm text-bone">
            {label}
            <input
              type={key === "email" ? "email" : "text"}
              className={style}
              autoComplete={autoComplete}
              maxLength={maxLength}
              value={value[key] ?? ""}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
      {!event && (
        <label className="block text-sm text-bone">
          Province or territory
          <select
            className={style}
            autoComplete="shipping address-level1"
            value={value.province}
            onChange={(e) =>
              onChange({ ...value, province: e.target.value as ShippingDraft["province"] })
            }
          >
            <option value="">Select province or territory</option>
            {Object.entries(PROVINCES).map(([code, [name]]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        Check your {event ? "pickup event" : "address"} before continuing. To change your delivery
        option after opening Square, return to your bag and start checkout again.
      </p>
    </fieldset>
  );
}
