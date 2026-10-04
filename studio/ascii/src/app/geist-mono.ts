import geistMonoUrl from "../../../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2?url";

const geistMono = new FontFace("Geist Mono", `url(${geistMonoUrl})`, {
  display: "swap",
  style: "normal",
  weight: "100 900",
});

document.fonts.add(geistMono);

export const geistMonoReady = geistMono.load().catch(() => undefined);

export { geistMonoUrl };
