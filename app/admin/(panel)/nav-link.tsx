"use client";

import Link, { useLinkStatus } from "next/link";

function Spinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden="true"
      className="ml-auto inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export default function NavLink({
  href,
  className,
  children,
  onClick,
  ariaCurrent,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaCurrent?: "page";
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={ariaCurrent}
      className={className}
    >
      {children}
      <Spinner />
    </Link>
  );
}