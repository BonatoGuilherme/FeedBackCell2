import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[background-color,box-shadow,transform,color] duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-[#4c5cf5]/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#4c5cf5] text-white shadow-[0_8px_24px_-8px_rgba(76,92,245,0.65)] hover:bg-[#3946e0]",
        ink: "bg-[#0b0b10] text-white hover:bg-black",
        outline:
          "border border-[#e1e3ec] bg-white text-[#0f1020] hover:border-[#c6c9d8] hover:bg-[#f7f8fb]",
        ghost: "text-[#0f1020] hover:bg-black/5",
        link: "text-[#4c5cf5] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
