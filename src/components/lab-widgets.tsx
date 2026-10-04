export function FrameWidget() {
  return (
    <svg
      aria-hidden="true"
      className="lab-widget lab-frame"
      viewBox="0 0 20 16"
      width="1.25em"
      height="1em"
    >
      <rect
        x="1.25"
        y="1.25"
        width="17.5"
        height="13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

export function AlignWidget() {
  return (
    <svg
      aria-hidden="true"
      className="lab-widget lab-align"
      viewBox="0 0 18 16"
      width="1.125em"
      height="1em"
    >
      <rect className="lab-align-mark lab-align-a" x="3" y="4" width="1" height="10" />
      <rect className="lab-align-mark lab-align-b" x="8.5" y="4" width="1" height="10" />
      <rect className="lab-align-mark lab-align-c" x="14" y="4" width="1" height="10" />
    </svg>
  );
}

export function MarkWidget() {
  return (
    <span aria-hidden="true" className="lab-widget lab-mark">
      {"{ }"}
    </span>
  );
}

export function StepsWidget() {
  return (
    <span aria-hidden="true" className="lab-widget lab-steps">
      01 02 03
    </span>
  );
}
