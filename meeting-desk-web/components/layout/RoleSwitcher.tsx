"use client";

import { setPreviewRole } from "@/app/(staff)/actions";
import type { PreviewRole } from "@/lib/preview-role";

type Option = { value: PreviewRole; label: string };

/** Phase 1 preview switcher (no login yet). Submits on change; works without JS via the button. */
export default function RoleSwitcher({ current, options }: { current: PreviewRole; options: Option[] }) {
  return (
    <form action={setPreviewRole} className="flex items-center gap-2 text-[13px]">
      <label htmlFor="preview-role" className="text-nav-idle">
        Preview as
      </label>
      <select
        id="preview-role"
        name="role"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-11 rounded-field border border-nav-active bg-nav-active px-2 text-ground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="h-11 rounded-field bg-card px-3 text-ink">
          Switch
        </button>
      </noscript>
    </form>
  );
}
