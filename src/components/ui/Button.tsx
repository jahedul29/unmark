import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  default: "border-line bg-bg2 text-txt hover:enabled:border-line2 hover:enabled:bg-bg3",
  primary: "border-transparent bg-accent text-onaccent font-[620] hover:enabled:bg-accent-hi",
  ghost: "border-transparent bg-transparent text-txt2 hover:enabled:bg-bg3 hover:enabled:text-txt",
  danger:
    "border-transparent bg-transparent text-txt2 hover:enabled:text-danger hover:enabled:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
};

export default function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={
        "inline-flex h-8 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[7px] border px-[13px] text-[13px] font-[560] transition-[background-color,border-color,box-shadow,transform] active:enabled:translate-y-px disabled:cursor-default disabled:opacity-40 [&_svg]:h-[15px] [&_svg]:w-[15px] " +
        VARIANTS[variant] +
        " " +
        className
      }
      {...props}
    />
  );
}
