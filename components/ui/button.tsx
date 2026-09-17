import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium whitespace-nowrap transition-all outline-none shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm shadow-indigo-500/20 hover:bg-primary/90 hover:shadow-md hover:shadow-indigo-500/20",
        destructive:
          "border-transparent bg-destructive text-white shadow-sm shadow-red-500/15 hover:bg-destructive/90 hover:shadow-md hover:shadow-red-500/15 focus-visible:ring-destructive/20 dark:bg-destructive/80 dark:hover:bg-destructive/70",
        outline:
          "border-border bg-background text-foreground shadow-xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-200",
        secondary:
          "border-indigo-100 bg-secondary text-secondary-foreground shadow-xs hover:border-indigo-200 hover:bg-indigo-100 dark:border-indigo-900/60 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/70",
        ghost:
          "border-transparent bg-transparent shadow-none hover:border-indigo-100 hover:bg-accent hover:text-accent-foreground dark:hover:border-indigo-900/60 dark:hover:bg-accent/70",
        link: "border-transparent bg-transparent text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
