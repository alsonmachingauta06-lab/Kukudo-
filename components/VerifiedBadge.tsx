export default function VerifiedBadge({ label = "Kukudo verified owner" }: { label?: string }) {
  return <span title={label} aria-label={label} className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#1688f8] text-white shadow-sm" style={{ verticalAlign: "middle" }}>
    <svg viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden="true"><path d="m5 10.2 3.1 3.1L15.2 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </span>;
}
