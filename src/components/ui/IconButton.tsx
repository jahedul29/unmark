import type { ButtonHTMLAttributes } from "react";

export default function IconButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
        "grid h-8 w-[34px] cursor-pointer place-items-center rounded-[7px] border border-transparent bg-transparent text-txt2 transition-colors hover:bg-bg3 hover:text-txt disabled:cursor-default disabled:opacity-35 [&_svg]:h-[17px] [&_svg]:w-[17px] " +
        className
      }
      {...props}
    />
  );
}
