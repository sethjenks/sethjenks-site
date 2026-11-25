"use client";

/**
 * The click-to-toggle Command key from the Paper.tips button note.
 * Closed cards render the unlit key with no control, so it can sit inside
 * the card button. Open cards get the real checkbox.
 */
export function CommandKey({ interactive }: { interactive: boolean }) {
  const key = (
    <span className="paper-key-body" aria-hidden="true">
      <span className="paper-key-cap">
        <span className="paper-key-grain" />
        <span className="paper-key-legend">⌘</span>
        <span className="paper-key-lip paper-key-on" />
        <span className="paper-key-lip-core paper-key-on" />
        <span className="paper-key-filament paper-key-on" />
      </span>
      <span className="paper-key-spill paper-key-on" />
      <span className="paper-key-well paper-key-off">
        <span className="paper-key-pit" />
      </span>
      <span className="paper-key-halo paper-key-on" />
      <span className="paper-key-lamp paper-key-on" />
      <span className="paper-key-lamp-mid paper-key-on" />
      <span className="paper-key-lamp-core paper-key-on" />
    </span>
  );

  return (
    <div className="paper-key-stage" data-live={interactive ? "" : undefined}>
      <span className="paper-key-stage-grain" aria-hidden="true" />
      {interactive ? (
        <label
          className="paper-key"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <input className="paper-key-toggle" type="checkbox" />
          <span className="paper-key-sr">Command key light</span>
          {key}
        </label>
      ) : (
        <div className="paper-key">{key}</div>
      )}
    </div>
  );
}
