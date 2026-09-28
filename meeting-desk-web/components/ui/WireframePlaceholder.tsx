/** Temporary marker for screens not built yet. Delete once the page matches its wireframe. */
export default function WireframePlaceholder({ wireframe, note }: { wireframe: string; note?: string }) {
  return (
    <div className="rounded-card border-2 border-dashed border-accent bg-accent-soft px-4 py-3 text-accent-strong">
      <p className="m-0 font-semibold">To build: match docs/wireframes/{wireframe}</p>
      {note ? <p className="mt-1 mb-0 text-sm">{note}</p> : null}
    </div>
  );
}
