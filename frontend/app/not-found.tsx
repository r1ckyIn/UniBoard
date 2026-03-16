/**
 * Global not-found page.
 * Required by next-intl to handle unknown routes at the root level.
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#faf9f5",
          color: "#2d2d2a",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
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
      </body>
    </html>
  );
}
