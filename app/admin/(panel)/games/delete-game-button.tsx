"use client";

import { deleteGame } from "@/app/admin/manage-actions";

export default function DeleteGameButton({
  id,
  name,
  productCount,
}: {
  id: string;
  name: string;
  productCount: number;
}) {
  const message =
    `Hapus "${name}"` +
    (productCount > 0 ? ` beserta ${productCount} produknya` : "") +
    "? Tindakan ini tidak bisa dibatalkan.";

  return (
    <form action={deleteGame} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
        }}
        className="font-semibold text-red-600 hover:underline"
      >
        Hapus
      </button>
    </form>
  );
}