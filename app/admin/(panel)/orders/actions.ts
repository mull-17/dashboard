"use server";

import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { TRANSITIONS, REFUND_FLAG, needsRefundFlag } from "@/lib/order-flow";

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin(); // server action bisa dipanggil langsung, cek ulang

  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const next = String(formData.get("status") ?? "");
  const memo = String(formData.get("memo") ?? "").trim().slice(0, 300);

  if (!orderNumber || !(next in OrderStatus)) return;
  const to = next as OrderStatus;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, status: true, note: true },
  });
  if (!order || !TRANSITIONS[order.status].includes(to)) return;

  const parts = [`${order.status} -> ${to}`];
  if (needsRefundFlag(order.status, to)) parts.push(REFUND_FLAG);
  if (memo) parts.push(memo);

  const line = `[${new Date().toISOString()}] ${parts.join(" | ")}`;

  // where menyertakan status lama: kalau status sudah berubah
  // (webhook / admin lain), update ini dibatalkan.
  const result = await prisma.order.updateMany({
    where: { id: order.id, status: order.status },
    data: {
      status: to,
      note: [order.note, line].filter(Boolean).join("\n"),
    },
  });
  if (result.count === 0) return;

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/dashboard");
}