export const STAGE_W = 1621;
export const STAGE_H = 949;

export function placed(size: { width: number; height: number }) {
  return {
    x: (STAGE_W - size.width) / 2,
    y: (STAGE_H - size.height) / 2,
    width: size.width,
    height: size.height,
  };
}
