/** Success/failure icon for the booking result screens (wireframes 7/8). */
export default function ResultIcon({ kind }: { kind: "success" | "warning" }) {
  const isSuccess = kind === "success";
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full ${
        isSuccess ? "bg-status-booked text-status-booked-text" : "bg-status-needs-info text-attention"
      }`}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {isSuccess ? <path d="M20 6 9 17l-5-5" /> : <><circle cx="12" cy="12" r="10" /><path d="M12 7v6M12 17h.01" /></>}
      </svg>
    </div>
  );
}
