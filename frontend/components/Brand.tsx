/** The UNDER wordmark. Black by default; pass `light` to render white (over the video hero). */
export function Logo({ height = 17, light = false }: { height?: number; light?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/under.png"
      alt="Under"
      style={{ height, width: "auto", display: "block", filter: light ? "invert(1)" : "none" }}
    />
  );
}
