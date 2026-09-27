import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border bg-background text-foreground",
        success: "bg-[#E1F0DF] text-[#3E7A42] dark:bg-[#3E7A42]/20 dark:text-[#A9D8AE]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
