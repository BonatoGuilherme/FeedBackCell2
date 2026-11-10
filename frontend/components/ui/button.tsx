import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-[background-color,border-color,box-shadow,color] duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-55 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // desativado: cinza neutro em vez do índigo/preto "lavado" pela opacidade
        default:
          "bg-accent text-on-accent shadow-elevation-sm hover:bg-accent-hover disabled:bg-surface-soft disabled:text-muted disabled:shadow-none disabled:opacity-100",
        ink: "bg-ink text-foreground ring-1 ring-line hover:bg-surface-hover disabled:bg-surface-soft disabled:text-muted disabled:opacity-100",
        outline:
          "border border-line bg-surface text-foreground shadow-elevation-sm hover:border-line-strong hover:bg-surface-hover",
        ghost: "text-foreground hover:bg-surface-soft",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-label",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-10",
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
