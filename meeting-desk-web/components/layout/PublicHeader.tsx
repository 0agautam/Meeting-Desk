/** Shared top bar for every public booking screen (wireframes 5–8). No nav, no staff data. */
export default function PublicHeader() {
  return (
    <header className="flex h-16 items-center border-b border-line bg-card px-8 max-md:h-14 max-md:px-5">
      <div className="font-serif text-lg font-semibold text-ink">Amazing Business Results</div>
    </header>
  );
}
