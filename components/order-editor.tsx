"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  catalogue,
  statuses,
  type Order,
  type OrderStatus,
} from "@/lib/order-types";
import { apiRequest, requestError } from "@/lib/client-api";
type Props = {
  order: Order | null;
  onSaved: (order: Order) => void;
  onClose: () => void;
};
export default function OrderEditor({ order, onSaved, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [fields, setFields] = useState({
    customerName: order?.customerName ?? "",
    phone: order?.phone ?? "",
    productName: order?.productName ?? "Vanilla Candle",
    quantity: String(order?.quantity ?? 1),
    unitPrice: String(order?.unitPrice ?? 8),
    status: order?.status ?? ("Pending" as OrderStatus),
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    nameInput.current?.focus();
  }, []);
  function field(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const body = {
        ...fields,
        quantity: Number(fields.quantity),
        unitPrice: Number(fields.unitPrice),
      };
      const saved = await apiRequest<Order>(
        order ? `/api/orders/${order.id}` : "/api/orders",
        {
          method: order ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      onSaved(saved);
    } catch (problem) {
      setError(requestError(problem));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="order-dialog"
      aria-labelledby="editor-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">
            {order ? "A SMALL CORRECTION" : "MAKE ROOM FOR A NEW ORDER"}
          </p>
          <h2 id="editor-title">{order ? "Edit order" : "Add an order"}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={pending}
          aria-label="Close order form"
        >
          ×
        </button>
      </div>
      <p className="dialog-intro">
        One customer, one product, all the details in one place.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="customerName">Customer name</label>
              <input
                ref={nameInput}
                id="customerName"
                name="customerName"
                required
                value={fields.customerName}
                onChange={(event) => field("customerName", event.target.value)}
                placeholder="e.g. Mira Demo"
                autoComplete="off"
              />
            </div>
            <div className="form-field">
              <label htmlFor="phone">Phone / demo contact</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={fields.phone}
                onChange={(event) => field("phone", event.target.value)}
                placeholder="e.g. DEMO-004"
                autoComplete="off"
              />
            </div>
            <div className="form-field form-wide">
              <label htmlFor="productName">Product</label>
              <select
                id="productName"
                name="productName"
                value={fields.productName}
                onChange={(event) => {
                  const product = catalogue.find(
                    (item) => item.name === event.target.value,
                  );
                  setFields((current) => ({
                    ...current,
                    productName: event.target.value,
                    unitPrice: product
                      ? String(product.price)
                      : current.unitPrice,
                  }));
                }}
              >
                {!catalogue.some(
                  (item) => item.name === fields.productName,
                ) && <option>{fields.productName}</option>}
                {catalogue.map((product) => (
                  <option key={product.name}>{product.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                required
                min="1"
                step="1"
                value={fields.quantity}
                onChange={(event) => field("quantity", event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="unitPrice">Unit price (USD)</label>
              <input
                id="unitPrice"
                name="unitPrice"
                type="number"
                required
                min="0"
                step="0.01"
                value={fields.unitPrice}
                onChange={(event) => field("unitPrice", event.target.value)}
              />
              <p className="field-hint">
                Editable for an agreed special price.
              </p>
            </div>
            {order ? (
              <div className="form-field form-wide">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={fields.status}
                  onChange={(event) => field("status", event.target.value)}
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="new-status form-wide">
                New orders start{" "}
                <span className="status-badge status-pending">Pending</span>
              </p>
            )}
          </div>
        </fieldset>
        <p className="form-note">
          The server calculates the saved total. Use fictional customer details
          only.
        </p>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={pending}
          >
            {pending ? "Saving…" : order ? "Save changes" : "Save order"}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
