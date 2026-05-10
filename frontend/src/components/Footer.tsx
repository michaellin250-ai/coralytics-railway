export function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        overflow: "hidden",
        height: "clamp(160px, 22vw, 280px)",
        width: "100%",
        flexShrink: 0,
      }}
    >
      <p
        style={{
          position: "absolute",
          left: "50%",
          bottom: "calc(clamp(60px, 13.5vw, 165px))",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontSize: "clamp(15px, 1.1vw, 20px)",
          letterSpacing: "0.1em",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
        }}
      >
        next generation ocean data
      </p>
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-25%",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontSize: "clamp(80px, 18vw, 220px)",
          fontWeight: 800,
          color: "var(--color-text-secondary)",
          opacity: 0.45,
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
          fontFamily: "var(--font-display)",
        }}
      >
        coralytics
      </div>
    </footer>
  );
}
