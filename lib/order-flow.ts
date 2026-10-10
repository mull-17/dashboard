import type { OrderStatus } from "@prisma/client";

// Transisi manual yang diizinkan dari halaman detail.
// Refund TIDAK ada di sini: hanya lewat markRefunded (FAILED -> REFUNDED).
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [],
  PAID: ["PROCESSING", "FAILED"],
  PROCESSING: ["SUCCESS", "FAILED"],
  SUCCESS: [],
  FAILED: [],
  REFUNDED: [],
};

// Order yang sudah dibayar lalu gagal harus ditandai perlu refund,
// supaya muncul di kartu "Perlu refund" dan daftar order.
export const REFUND_FLAG = "refund manual";

export const needsRefundFlag = (from: OrderStatus, to: OrderStatus) =>
  to === "FAILED" && (from === "PAID" || from === "PROCESSING");