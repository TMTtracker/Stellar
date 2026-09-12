import { Button as ButtonPrimitive } from "@base-ui/react/button"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button }
