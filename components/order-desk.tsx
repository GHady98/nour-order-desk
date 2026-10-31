"use client";
import { useEffect, useRef, useState } from "react";
import { money, type Order } from "@/lib/order-types";
import { apiRequest, requestError } from "@/lib/client-api";
import OrderEditor from "./order-editor";
import DeleteOrder from "./delete-order";
export default function OrderDesk() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editor, setEditor] = useState<{ order: Order | null } | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [notice, setNotice] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest<Order[]>("/api/orders", { signal: controller.signal })
      .then((data) => {
        setOrders(data);
        setListError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setListError(requestError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function refresh() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiRequest<Order[]>("/api/orders");
      setOrders(data);
      setSelected((current) =>
        current
          ? (data.find((order) => order.id === current.id) ?? null)
          : null,
      );
    } catch (error) {
      setListError(requestError(error));
    } finally {
      setLoading(false);
    }
  }
  async function view(id: string) {
    if (detailLoading) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      setSelected(await apiRequest<Order>(`/api/orders/${id}`));
      requestAnimationFrame(() => detailTitle.current?.focus());
    } catch (error) {
      setDetailError(requestError(error));
    } finally {
      setDetailLoading(false);
    }
  }
  function closeEditor() {
    const wasEditing = Boolean(editor?.order);
    setEditor(null);
    requestAnimationFrame(() => {
      if (wasEditing) editButton.current?.focus();
      else addButton.current?.focus();
    });
  }
  function saved(order: Order) {
    setDetailError("");
    setOrders((current) => [
      order,
      ...current.filter((item) => item.id !== order.id),
    ]);
    setSelected(order);
    setNotice(
      `Order saved for ${order.customerName}. Server total: ${money(order.total)}. Status: ${order.status}.`,
    );
    closeEditor();
  }
  function deleted(id: string) {
    setOrders((current) => current.filter((order) => order.id !== id));
    setSelected((current) => (current?.id === id ? null : current));
    setDeleting(null);
    setNotice("Order deleted. The list and summary have been updated.");
    requestAnimationFrame(() => addButton.current?.focus());
  }
  const pending = orders.filter((order) => order.status === "Pending").length;
  const delivered = orders.filter(
    (order) => order.status === "Delivered",
  ).length;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to order desk
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♧
          </span>
          <span>
            NOUR <small>CANDLE STUDIO</small>
          </span>
        </div>
        <div className="header-context">
          <span>THE STUDIO, ORGANIZED</span>
          <span className="demo-pill">
            <span aria-hidden="true">●</span> Local learning demo
          </span>
        </div>
      </header>
      <main id="main" className="page-shell">
        <section className="intro">
          <div>
            <p className="eyebrow">SMALL BATCHES. THOUGHTFUL DETAILS.</p>
            <h1>
              The order desk<span>.</span>
            </h1>
            <p>
              A little order. A lot more calm.
              <br className="mobile-break" /> Keep every candle, customer, and
              next step in view.
            </p>
          </div>
          <button
            ref={addButton}
            className="button button-primary"
            disabled={loading}
            onClick={() => {
              setNotice("");
              setEditor({ order: null });
            }}
          >
            <span aria-hidden="true">＋</span> Add order
          </button>
        </section>
        <div
          className="grid gap-4 md:grid-cols-3 summary-grid"
          aria-label="Order summary"
        >
          <article className="summary-card">
            <div className="summary-top">
              <p>Total orders</p>
              <span aria-hidden="true">▤</span>
            </div>
            <strong data-testid="total-count">
              {loading && orders.length === 0 ? "—" : orders.length}
            </strong>
            <small>Every order, in one place</small>
          </article>
          <article className="summary-card pending-card">
            <div className="summary-top">
              <p>Pending</p>
              <span aria-hidden="true">◷</span>
            </div>
            <strong data-testid="pending-count">
              {loading && orders.length === 0 ? "—" : pending}
            </strong>
            <small>Ready for your attention</small>
          </article>
          <article className="summary-card">
            <div className="summary-top">
              <p>Delivered</p>
              <span aria-hidden="true">✓</span>
            </div>
            <strong data-testid="delivered-count">
              {loading && orders.length === 0 ? "—" : delivered}
            </strong>
            <small>A little warmth, on its way</small>
          </article>
        </div>
        <p className="notice" role="status" aria-live="polite">
          {notice}
        </p>
        <div className="desk-grid">
          <section className="orders-panel" aria-labelledby="orders-title">
            <div className="panel-heading">
              <div>
                <h2 id="orders-title">Studio orders</h2>
                <p>One product per order. Prices in USD.</p>
              </div>
              <button
                className="refresh-button"
                disabled={loading}
                onClick={refresh}
                aria-label="Refresh orders"
              >
                {loading ? "Loading…" : "↻ Refresh"}
              </button>
            </div>
            {loading && (
              <div className="loading-state" role="status">
                <span className="spinner" aria-hidden="true" />{" "}
                {orders.length
                  ? "Refreshing orders…"
                  : "Gathering your orders…"}
              </div>
            )}
            {listError && (
              <div className="error-box" role="alert">
                <strong>We couldn’t load your orders.</strong>
                <p>{listError}</p>
                <button
                  className="button button-quiet"
                  disabled={loading}
                  onClick={refresh}
                >
                  Retry loading orders
                </button>
              </div>
            )}
            {!loading && !listError && orders.length === 0 && (
              <div className="empty-state">
                <span aria-hidden="true">✦</span>
                <h3>A fresh page for the studio.</h3>
                <p>No orders yet. Add the first one when you’re ready.</p>
                <button
                  className="button button-quiet"
                  onClick={() => setEditor({ order: null })}
                >
                  Add your first order
                </button>
              </div>
            )}
            {orders.length > 0 && (
              <div className="order-table" role="table" aria-label="Orders">
                <div className="order-table-head" role="row">
                  <span role="columnheader">Customer & product</span>
                  <span role="columnheader">Qty</span>
                  <span role="columnheader">Total</span>
                  <span role="columnheader">Status</span>
                  <span className="sr-only" role="columnheader">
                    Details
                  </span>
                </div>
                <div role="rowgroup">
                  {orders.map((order) => (
                    <div
                      className={`order-row ${selected?.id === order.id ? "selected-row" : ""}`}
                      role="row"
                      key={order.id}
                      data-testid="order-row"
                    >
                      <div role="cell" className="order-person">
                        <span className="order-avatar" aria-hidden="true">
                          {order.customerName.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong>{order.customerName}</strong>
                          <p>{order.productName}</p>
                        </div>
                      </div>
                      <div role="cell" className="order-quantity">
                        <span className="mobile-cell-label">Qty </span>
                        {order.quantity}
                      </div>
                      <div role="cell" className="order-total">
                        {money(order.total)}
                      </div>
                      <div role="cell">
                        <span
                          className={`status-badge status-${order.status.toLowerCase()}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div role="cell">
                        <button
                          className="view-button"
                          disabled={detailLoading || loading}
                          onClick={() => view(order.id)}
                          aria-label={`View order for ${order.customerName}`}
                        >
                          View <span aria-hidden="true">↗</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <aside className="detail-panel" aria-labelledby="details-title">
            <div className="detail-heading">
              <p className="eyebrow">THE SMALL DETAILS</p>
              <h2 ref={detailTitle} tabIndex={-1} id="details-title">
                Order details
              </h2>
            </div>
            {detailLoading ? (
              <div role="status" className="detail-placeholder">
                Loading order details…
              </div>
            ) : detailError ? (
              <div role="alert" className="error-box">
                {detailError}
              </div>
            ) : selected ? (
              <>
                <div className="detail-person">
                  <span
                    className={`status-badge status-${selected.status.toLowerCase()}`}
                  >
                    {selected.status}
                  </span>
                  <h3>{selected.customerName}</h3>
                  <p>{selected.phone}</p>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Product</dt>
                    <dd>{selected.productName}</dd>
                  </div>
                  <div>
                    <dt>Quantity</dt>
                    <dd>{selected.quantity}</dd>
                  </div>
                  <div>
                    <dt>Unit price</dt>
                    <dd>{money(selected.unitPrice)}</dd>
                  </div>
                  <div className="detail-total">
                    <dt>Order total</dt>
                    <dd>{money(selected.total)}</dd>
                  </div>
                </dl>
                <p className="order-id">
                  ORDER ID <span>{selected.id}</span>
                </p>
                <div className="detail-actions">
                  <button
                    ref={editButton}
                    className="button button-primary"
                    onClick={() => setEditor({ order: selected })}
                  >
                    Edit order <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    className="delete-link"
                    onClick={() => setDeleting(selected)}
                  >
                    Delete this order
                  </button>
                </div>
              </>
            ) : (
              <div className="detail-placeholder">
                <span aria-hidden="true">✧</span>
                <p>Every order has a story.</p>
                <small>
                  Select View to see the full details and make a change.
                </small>
              </div>
            )}
            <div className="studio-note">
              <span aria-hidden="true">✦</span>
              <p>
                Made with care in Beirut.
                <br />
                Managed with a little more clarity.
              </p>
            </div>
          </aside>
        </div>
        <footer>
          <p>
            Temporary server memory · Orders can reset after a server restart or
            development reload.
          </p>
          <span>FICTIONAL CUSTOMERS ONLY · TECHTALKS / 04</span>
        </footer>
      </main>
      {editor && (
        <OrderEditor
          order={editor.order}
          onSaved={saved}
          onClose={closeEditor}
        />
      )}{" "}
      {deleting && (
        <DeleteOrder
          order={deleting}
          onDeleted={deleted}
          onClose={() => {
            setDeleting(null);
            requestAnimationFrame(() => editButton.current?.focus());
          }}
        />
      )}
    </>
  );
}
