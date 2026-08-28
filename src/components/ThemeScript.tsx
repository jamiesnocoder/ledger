// Inline, synchronous, runs before paint to avoid a flash of the wrong theme.
const SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("ledger-theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
