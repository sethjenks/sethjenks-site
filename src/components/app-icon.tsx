import type { CSSProperties } from "react";

export type AppIconMark = "vault" | "signer" | "wallet";

const MARK_SRC: Record<AppIconMark, { full: string; compact: string; glyph: string }> = {
  vault: {
    full: "/media/card/icon-vault.png",
    compact: "/media/card/icon-vault-256.png",
    glyph: "/media/card/icon-hex.svg",
  },
  signer: {
    full: "/media/card/icon-signer.png",
    compact: "/media/card/icon-signer-256.png",
    glyph: "/media/card/icon-link.svg",
  },
  wallet: {
    full: "/media/card/icon-wallet.png",
    compact: "/media/card/icon-wallet-256.png",
    glyph: "/media/card/icon-tripod.svg",
  },
};

export const APP_ICON_MARKS = Object.keys(MARK_SRC) as AppIconMark[];

type AppIconProps = {
  mark?: AppIconMark;
  /** Per-instance corner style. Rounded uses the full PNG; square is a flat tile + glyph. */
  rounded?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Hide the graphic (mask / silhouette mode). */
  blank?: boolean;
};

export function AppIcon({
  mark = "vault",
  rounded = true,
  className,
  style,
  blank = false,
}: AppIconProps) {
  const classes = ["app-icon", className].filter(Boolean).join(" ");
  const src = MARK_SRC[mark];

  return (
    <span
      className={classes}
      data-rounded={rounded ? "" : undefined}
      data-square={rounded ? undefined : ""}
      data-blank={blank ? "" : undefined}
      data-mark={mark}
      style={style}
      aria-hidden="true"
    >
      {rounded || blank ? null : <span className="app-icon-core" />}
      {blank ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="app-icon-mark"
          src={rounded ? src.full : src.glyph}
          srcSet={rounded ? `${src.compact} 256w, ${src.full} 512w` : undefined}
          sizes={rounded ? "256px" : undefined}
          alt=""
          width={rounded ? 512 : undefined}
          height={rounded ? 512 : undefined}
          draggable={false}
        />
      )}
    </span>
  );
}
