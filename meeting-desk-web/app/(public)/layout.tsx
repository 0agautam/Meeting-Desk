import PublicHeader from "@/components/layout/PublicHeader";

/** Public (client-facing) pages: the shared "Amazing Business Results" bar, no staff nav/data. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
