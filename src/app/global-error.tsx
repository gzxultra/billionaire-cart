"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#F8F5F0", margin: 0 }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}>
          <div style={{ maxWidth: "320px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💳</div>
            <h2 style={{
              fontSize: "18px",
              fontFamily: "Georgia, serif",
              color: "rgba(232,228,223,0.9)",
              marginBottom: "8px",
            }}>
              Something broke
            </h2>
            <p style={{
              fontSize: "12px",
              color: "rgba(107,101,96,0.6)",
              marginBottom: "16px",
            }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={reset}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "rgba(155,139,122,0.15)",
                color: "#8C7A65",
                fontSize: "12px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
