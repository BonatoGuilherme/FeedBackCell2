import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-display text-xl font-extrabold leading-none transition-[background-color,border-color,box-shadow,color,transform] duration-150 outline-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-pink disabled:pointer-events-none disabled:opacity-55 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // placa verde-limão com sombra deslocada; desativado fica chapado e sem sombra
        default:
          "bg-lime text-ink shadow-[4px_4px_0_var(--ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-cyan hover:shadow-[6px_6px_0_var(--ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--ink)] disabled:bg-surface-soft disabled:text-muted disabled:shadow-none disabled:opacity-100",
        ink: "bg-ink text-foreground shadow-[4px_4px_0_var(--pink)] hover:bg-ink-2 disabled:bg-surface-soft disabled:text-muted disabled:shadow-none disabled:opacity-100",
        outline:
          "bg-cream text-ink shadow-[4px_4px_0_var(--ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-cyan hover:shadow-[6px_6px_0_var(--ink)]",
        ghost: "text-foreground hover:bg-surface-soft hover:text-lime",
        link: "font-sans text-base font-semibold text-lime underline underline-offset-4 hover:text-cyan",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-[17px]",
        lg: "h-13 px-6 text-2xl",
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
