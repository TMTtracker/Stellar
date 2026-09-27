import { cn } from "@/lib/utils"
import { badgeVariants } from "./badge-variants"

function Badge({
  className,
  variant = "default",
  ...props
}) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge }
