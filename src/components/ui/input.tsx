import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";

const inputClasses =
  "h-9 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-sm";

export function Input({
  className,
  ...props
}: ComponentProps<typeof BaseInput>) {
  return (
    <BaseInput
      data-slot="input"
      className={`${inputClasses}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
