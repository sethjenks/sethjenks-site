import { ExpandIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function TileChrome({
  label,
  titleClassName,
  expandClassName,
}: {
  label: string;
  titleClassName: string;
  expandClassName: string;
}) {
  return (
    <>
      <h3 className={titleClassName}>{label}</h3>
      <span className={expandClassName} aria-hidden="true">
        <HugeiconsIcon icon={ExpandIcon} size={16} strokeWidth={2} color="currentColor" />
      </span>
    </>
  );
}
