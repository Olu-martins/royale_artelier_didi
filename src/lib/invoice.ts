import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { CurrencyCode, Order, OrderItem } from "@/services/api";
import {
  PICKUP_LOCATIONS,
  type PickupLocation,
} from "@/lib/pickup-locations";
import { formatMoneyIn } from "@/lib/money";

export type InvoiceFormat = "pdf" | "image";

export interface InvoiceCustomer {
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface InvoicePayload {
  orderNumber: string;
  createdAt: string;
  currency: CurrencyCode;
  subtotal: number;
  total: number;
  items: Array<{
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }>;
  customer: InvoiceCustomer;
  pickup: PickupLocation;
  note?: string;
  formatMoney: (amount: number) => string;
}

export const orderToInvoicePayload = (
  order: Order,
  pickup: PickupLocation,
  formatMoney: (amount: number) => string,
  customerOverrides?: Partial<InvoiceCustomer>,
): InvoicePayload => {
  const address = order.shippingAddress;
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    currency: order.currency,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    items: order.items.map((item: OrderItem) => ({
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: Number(item.price),
    })),
    customer: {
      name:
        customerOverrides?.name ??
        address.recipientName ??
        address.label ??
        "Customer",
      email: customerOverrides?.email,
      phone: customerOverrides?.phone ?? address.phone ?? undefined,
      businessName: customerOverrides?.businessName,
      street: address.street,
      city: address.city,
      zipCode: address.zipCode,
      country: address.country,
    },
    pickup,
    note: order.note ?? undefined,
    formatMoney,
  };
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const customerLines = (customer: InvoiceCustomer) =>
  [
    customer.name,
    customer.businessName ? `Business: ${customer.businessName}` : null,
    customer.phone,
    customer.email,
    [customer.street, customer.city, customer.zipCode]
      .filter((part) => Boolean(part && part.trim() && part.trim() !== "N/A"))
      .join(", "),
    customer.country,
  ].filter((line): line is string => Boolean(line && line.trim()));

const INVOICE_CSS_WIDTH_PX = 794;
const CAPTURE_SCALE = 2;
const LOGO_SRC = "/logo-full.png";

export const buildInvoiceElement = (payload: InvoicePayload): HTMLDivElement => {
  const root = document.createElement("div");
  root.setAttribute(
    "style",
    [
      "position:fixed",
      "left:-10000px",
      "top:0",
      `width:${INVOICE_CSS_WIDTH_PX}px`,
      "padding:48px 56px",
      "background:#ffffff",
      "color:#111111",
      "font-family:Georgia,'Times New Roman',serif",
      "font-size:16px",
      "line-height:1.5",
      "box-sizing:border-box",
      "-webkit-font-smoothing:antialiased",
    ].join(";"),
  );

  const itemsHtml = payload.items
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;">
          <div style="font-weight:600;font-size:17px;">${escapeHtml(item.name)}</div>
          <div style="font-size:14px;color:#555;margin-top:4px;">
            Size ${escapeHtml(item.size)} · ${escapeHtml(item.color)} · Qty ${item.quantity}
          </div>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #e8e8e8;text-align:right;white-space:nowrap;vertical-align:top;font-weight:600;font-size:17px;">
          ${escapeHtml(payload.formatMoney(item.price * item.quantity))}
        </td>
      </tr>`,
    )
    .join("");

  const detailsHtml = customerLines(payload.customer)
    .map((line) => `<div style="margin-bottom:2px;">${escapeHtml(line)}</div>`)
    .join("");

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:28px;margin-bottom:36px;">
      <div>
        <img src="${LOGO_SRC}" alt="Royale Artelier" style="display:block;height:132px;width:132px;object-fit:contain;" />
        <div style="margin-top:4px;font-size:15px;color:#555;text-transform:uppercase;letter-spacing:0.12em;">Invoice</div>
      </div>
      <div style="text-align:right;font-size:15px;line-height:1.55;">
        <div style="font-size:16px;"><strong>${escapeHtml(payload.orderNumber)}</strong></div>
        <div style="color:#555;">${escapeHtml(formatDate(payload.createdAt))}</div>
        <div style="color:#555;">Currency: ${escapeHtml(payload.currency)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px;font-size:15px;line-height:1.55;">
      <div>
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#777;margin-bottom:10px;font-weight:600;">Customer</div>
        ${detailsHtml}
      </div>
      <div>
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#777;margin-bottom:10px;font-weight:600;">Pickup location</div>
        <div style="font-weight:600;margin-bottom:2px;">${escapeHtml(payload.pickup.label)}</div>
        <div>${escapeHtml(payload.pickup.address)}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:16px;margin-bottom:24px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:10px;border-bottom:2px solid #111;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Item</th>
          <th style="text-align:right;padding-bottom:10px;border-bottom:2px solid #111;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;">
      <div style="min-width:260px;font-size:16px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;color:#555;">
          <span>Subtotal</span>
          <span>${escapeHtml(payload.formatMoney(payload.subtotal))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0 0;border-top:2px solid #111;font-size:22px;font-weight:700;">
          <span>Total</span>
          <span>${escapeHtml(payload.formatMoney(payload.total))}</span>
        </div>
      </div>
    </div>

    ${
      payload.note
        ? `<div style="margin-top:32px;font-size:15px;color:#333;"><strong>Note:</strong> ${escapeHtml(payload.note)}</div>`
        : ""
    }

    <div style="margin-top:40px;padding-top:18px;border-top:1px solid #e8e8e8;font-size:14px;color:#666;line-height:1.5;">
      Your order has been recorded. Your invoice is awaiting payment.
    </div>
  `;

  document.body.appendChild(root);
  return root;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const waitForImages = (element: HTMLElement) =>
  Promise.all(
    [...element.querySelectorAll("img")].map(
      (img) =>
        new Promise<void>((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Could not load logo"));
        }),
    ),
  );

const loadLogoDataUrl = async () => {
  const response = await fetch(LOGO_SRC);
  if (!response.ok) {
    throw new Error("Could not load logo");
  }
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read logo"));
    reader.readAsDataURL(blob);
  });
};

const canvasFromInvoice = async (payload: InvoicePayload) => {
  const element = buildInvoiceElement(payload);
  try {
    await waitForImages(element);
    void element.offsetWidth;
    return await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: CAPTURE_SCALE,
      useCORS: true,
      width: INVOICE_CSS_WIDTH_PX,
      windowWidth: INVOICE_CSS_WIDTH_PX,
    });
  } finally {
    element.remove();
  }
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const pdfMoney = (payload: InvoicePayload, amount: number) => {
  const formatted = payload.formatMoney(amount);
  if (payload.currency === "NGN") {
    return formatted.replace(/₦/g, "NGN ");
  }
  return formatted;
};

const pdfFromPayload = async (payload: InvoicePayload): Promise<Blob> => {
  const logo = await loadLogoDataUrl();
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const right = pageWidth - margin;
  const bottomLimit = pageHeight - margin;

  let y = margin;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm <= bottomLimit) return;
    pdf.addPage();
    y = margin;
  };

  const setText = (
    sizePt: number,
    style: "normal" | "bold" = "normal",
    color: [number, number, number] = [17, 17, 17],
  ) => {
    pdf.setFont("times", style);
    pdf.setFontSize(sizePt);
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  const writeWrapped = (
    text: string,
    x: number,
    maxWidth: number,
    lineHeightMm: number,
    align: "left" | "right" | "center" = "left",
  ) => {
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(lineHeightMm);
      pdf.text(line, x, y, { align });
      y += lineHeightMm;
    }
  };

  y += 2;
  const logoSize = 32;
  pdf.addImage(logo, "PNG", margin, y, logoSize, logoSize);
  y += logoSize + 3;

  setText(11, "bold", [102, 102, 102]);
  pdf.text("INVOICE", margin, y);
  setText(12, "bold");
  pdf.text(payload.orderNumber, right, y, { align: "right" });
  y += 6;

  setText(11, "normal", [85, 85, 85]);
  pdf.text(formatDate(payload.createdAt), margin, y);
  pdf.text(`Currency: ${payload.currency}`, right, y, { align: "right" });
  y += 5;

  pdf.setDrawColor(17, 17, 17);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, right, y);
  y += 9;

  const colGap = 6;
  const colWidth = (contentWidth - colGap) / 2;
  const leftColX = margin;
  const rightColX = margin + colWidth + colGap;
  const sectionTop = y;

  const drawLabeledBlock = (
    title: string,
    lines: string[],
    x: number,
    startY: number,
  ) => {
    let cursor = startY;
    setText(10, "bold", [120, 120, 120]);
    pdf.text(title.toUpperCase(), x, cursor);
    cursor += 6.5;
    lines.forEach((line, index) => {
      setText(index === 0 ? 13 : 12, index === 0 ? "bold" : "normal");
      const wrapped = pdf.splitTextToSize(line, colWidth) as string[];
      wrapped.forEach((part) => {
        pdf.text(part, x, cursor);
        cursor += 5.8;
      });
    });
    return cursor;
  };

  const customerBlock = customerLines(payload.customer);
  const pickupBlock = [payload.pickup.label, payload.pickup.address].filter(
    Boolean,
  );
  const leftEnd = drawLabeledBlock(
    "Customer",
    customerBlock,
    leftColX,
    sectionTop,
  );
  const rightEnd = drawLabeledBlock(
    "Pickup location",
    pickupBlock,
    rightColX,
    sectionTop,
  );
  y = Math.max(leftEnd, rightEnd) + 8;

  ensureSpace(16);
  setText(10, "bold", [120, 120, 120]);
  pdf.text("ITEM", margin, y);
  pdf.text("AMOUNT", right, y, { align: "right" });
  y += 3;
  pdf.setDrawColor(17, 17, 17);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, right, y);
  y += 7;

  const amountColWidth = 36;
  const itemColWidth = contentWidth - amountColWidth - 4;

  for (const item of payload.items) {
    const amount = pdfMoney(payload, item.price * item.quantity);
    const detail = `Size ${item.size} · ${item.color} · Qty ${item.quantity}`;
    setText(13, "bold");
    const nameLines = pdf.splitTextToSize(item.name, itemColWidth) as string[];
    setText(11, "normal", [85, 85, 85]);
    const detailLines = pdf.splitTextToSize(detail, itemColWidth) as string[];
    const blockHeight = nameLines.length * 6 + detailLines.length * 5.4 + 6;
    ensureSpace(blockHeight);

    setText(13, "bold");
    let itemY = y;
    for (const line of nameLines) {
      pdf.text(line, margin, itemY);
      itemY += 6;
    }
    setText(11, "normal", [85, 85, 85]);
    for (const line of detailLines) {
      pdf.text(line, margin, itemY);
      itemY += 5.4;
    }

    setText(13, "bold");
    pdf.text(amount, right, y, { align: "right" });

    y = itemY + 1;
    pdf.setDrawColor(225, 225, 225);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, right, y);
    y += 6.5;
  }

  ensureSpace(30);
  y += 1;
  const totalsWidth = 66;
  const totalsX = right - totalsWidth;

  setText(12, "normal", [85, 85, 85]);
  pdf.text("Subtotal", totalsX, y);
  pdf.text(pdfMoney(payload, payload.subtotal), right, y, { align: "right" });
  y += 4;

  pdf.setDrawColor(17, 17, 17);
  pdf.setLineWidth(0.5);
  pdf.line(totalsX, y, right, y);
  y += 8;

  setText(16, "bold");
  pdf.text("Total", totalsX, y);
  pdf.text(pdfMoney(payload, payload.total), right, y, { align: "right" });
  y += 12;

  if (payload.note?.trim()) {
    ensureSpace(16);
    setText(12, "bold");
    pdf.text("Note", margin, y);
    y += 6;
    setText(12, "normal", [51, 51, 51]);
    writeWrapped(payload.note.trim(), margin, contentWidth, 5.8);
    y += 4;
  }

  ensureSpace(16);
  pdf.setDrawColor(225, 225, 225);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, right, y);
  y += 7;
  setText(11, "normal", [102, 102, 102]);
  writeWrapped(
    "Your order has been recorded. Your invoice is awaiting payment.",
    margin,
    contentWidth,
    5.4,
  );

  return pdf.output("blob");
};

export const downloadInvoice = async (
  payload: InvoicePayload,
  format: InvoiceFormat,
): Promise<{ blob: Blob; filename: string; mimeType: string }> => {
  const safeNumber = payload.orderNumber.replace(/[^\w-]+/g, "_");

  if (format === "image") {
    const canvas = await canvasFromInvoice(payload);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Could not create image")),
        "image/png",
      );
    });
    const filename = `royale-artelier-invoice-${safeNumber}.png`;
    triggerDownload(blob, filename);
    return { blob, filename, mimeType: "image/png" };
  }

  const blob = await pdfFromPayload(payload);
  const filename = `royale-artelier-invoice-${safeNumber}.pdf`;
  triggerDownload(blob, filename);
  return { blob, filename, mimeType: "application/pdf" };
};

export const orderNoteParts = (note?: string | null) => {
  const text = (note ?? "").trim();
  if (!text) {
    return { pickupLabel: null, pickupAddress: null, businessName: null, customerNote: null };
  }

  const lines = text.split("\n").map((line) => line.trim());
  let pickupLabel: string | null = null;
  let pickupAddress: string | null = null;
  let businessName: string | null = null;
  const other: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    if (line.toLowerCase().startsWith("pickup:")) {
      pickupLabel = line.slice(7).trim();
      continue;
    }
    if (line.toLowerCase().startsWith("pickup location:")) {
      pickupAddress = line.slice("pickup location:".length).trim();
      continue;
    }
    if (line.toLowerCase().startsWith("business:")) {
      businessName = line.slice(9).trim();
      continue;
    }
    other.push(line);
  }

  return {
    pickupLabel,
    pickupAddress,
    businessName,
    customerNote: other.length ? other.join("\n") : null,
  };
};

const resolvePickupFromOrder = (order: Order): PickupLocation => {
  const parts = orderNoteParts(order.note);
  const byLabel = parts.pickupLabel
    ? PICKUP_LOCATIONS.find((location) => location.label === parts.pickupLabel)
    : null;
  if (byLabel) return byLabel;

  const byAddress = parts.pickupAddress
    ? PICKUP_LOCATIONS.find(
        (location) => location.address === parts.pickupAddress,
      )
    : null;
  if (byAddress) return byAddress;

  return {
    id: "stored-pickup",
    label: parts.pickupLabel ?? "Pickup",
    address: parts.pickupAddress ?? "See order note",
    country: order.shippingAddress?.country ?? "",
  };
};

export const invoicePayloadFromOrder = (order: Order): InvoicePayload => {
  const parts = orderNoteParts(order.note);
  const address = order.shippingAddress;
  const payload = orderToInvoicePayload(
    order,
    resolvePickupFromOrder(order),
    (amount) => formatMoneyIn(amount, order.currency),
    {
      name:
        order.guestName ??
        address?.recipientName ??
        address?.label ??
        "Customer",
      email: order.guestEmail ?? undefined,
      phone: order.guestPhone ?? address?.phone ?? undefined,
      businessName: parts.businessName ?? undefined,
    },
  );
  return {
    ...payload,
    note: parts.customerNote ?? undefined,
  };
};

export const shareInvoiceFile = async (input: {
  blob: Blob;
  filename: string;
  mimeType: string;
  orderNumber: string;
}): Promise<"shared" | "unsupported" | "cancelled"> => {
  const file = new File([input.blob], input.filename, {
    type: input.mimeType,
  });

  const data: ShareData = {
    title: `Royale Artelier invoice ${input.orderNumber}`,
    text: `Invoice ${input.orderNumber} from Royale Artelier`,
    files: [file],
  };

  if (!navigator.share) return "unsupported";

  const canShareFiles =
    typeof navigator.canShare !== "function" || navigator.canShare(data);

  try {
    if (canShareFiles) {
      await navigator.share(data);
    } else {
      await navigator.share({
        title: data.title,
        text: `${data.text}. The invoice was downloaded to your device.`,
      });
    }
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    throw error;
  }
};
