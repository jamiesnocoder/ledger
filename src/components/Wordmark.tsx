// Unbounded Bold, all caps, tracking loosens as size shrinks - per the
// brand kit's reproduction spec (fonts.google.com/specimen/Unbounded).
export function Wordmark({ size = 17 }: { size?: number }) {
  const tracking = size >= 34 ? "0.03em" : size >= 16 ? "0.045em" : "0.06em";
  return (
    <span
      style={{
        fontFamily: "var(--font-wordmark)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: tracking,
        fontSize: size,
        lineHeight: 1,
        color: "var(--text)",
      }}
    >
      Ledger
    </span>
  );
}
