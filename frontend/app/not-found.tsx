/**
 * Global not-found page.
 * Required by next-intl to handle unknown routes at the root level.
 * Renders inside root layout (no html/body wrapper to avoid hydration mismatch).
 */
export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#2d2d2a",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "2rem",
            marginBottom: "0.5rem",
          }}
        >
          404
        </h1>
        <p style={{ color: "#6b6b65" }}>Page not found</p>
      </div>
    </div>
  );
}
