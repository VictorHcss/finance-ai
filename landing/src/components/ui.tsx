import type { ReactNode } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="#top" className={`flex items-center gap-2 shrink-0 ${className}`} aria-label="Finance.AI — início">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25 ring-1 ring-white/20">
        <span className="text-sm font-extrabold text-zinc-950">$</span>
      </span>
      <span className="font-bold tracking-tight text-zinc-50">
        Finance<span className="text-emerald-400">.AI</span>
      </span>
    </a>
  );
}

const buttonStyles = {
  primary:
    "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30",
  secondary: "bg-white/5 text-zinc-100 ring-1 ring-inset ring-white/10 hover:bg-white/10",
  ghost: "text-zinc-300 hover:text-zinc-50 hover:bg-white/5",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 px-3.5 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  };
  return (
    <a
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${sizes[size]} ${buttonStyles[variant]} ${className}`}
    >
      {children}
    </a>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
        {title}
      </h2>
      {description && <p className="mt-4 text-base leading-relaxed text-zinc-400 sm:text-lg">{description}</p>}
    </div>
  );
}

export function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
