/** Tenor mark: a rounded tile with a descending curve — the value declining toward maturity. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ display: "block", flex: "none" }}>
      <rect width="24" height="24" rx="7" fill="#0E6E52" />
      <path d="M5 7 C 10 7.5, 11 15, 19 17" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="19" cy="17" r="1.7" fill="#fff" />
    </svg>
  );
}
