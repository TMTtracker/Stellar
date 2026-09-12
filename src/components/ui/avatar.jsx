import { cn } from "@/lib/utils"

function Avatar({ className, ...props }) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold",
        className
      )}
      {...props} />
  );
}

function AvatarImage({ className, alt = "", ...props }) {
  return (
    <img
      data-slot="avatar-image"
      alt={alt}
      className={cn("aspect-square size-full object-cover", className)}
      {...props} />
  );
}

function AvatarFallback({ className, ...props }) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground",
        className
      )}
      {...props} />
  );
}

export { Avatar, AvatarImage, AvatarFallback }
