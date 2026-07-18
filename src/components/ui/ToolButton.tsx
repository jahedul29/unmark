import type { ButtonHTMLAttributes, Ref } from "react";

export default function ToolButton({
  className = "",
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      className={
        "relative grid cursor-pointer place-items-center rounded-lg border border-transparent bg-transparent text-txt2 transition-colors hover:bg-bg3 hover:text-txt disabled:cursor-default disabled:opacity-35 [&_svg]:h-5 [&_svg]:w-5 aria-[pressed=true]:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] aria-[pressed=true]:text-accent aria-[pressed=true]:shadow-[inset_0_0_0_1px_var(--accent)] " +
        className
      }
      {...props}
    />
  );
}
