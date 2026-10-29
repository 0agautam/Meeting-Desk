import { ALL_ROLES } from "@/lib/auth/permissions";
import type { StaffRole } from "@/lib/types";
import { FIELD_LABEL } from "@/lib/ui/classes";
import { ROLE_HELP, SETTINGS_PAGE } from "./settingsContent";

/** Checkboxes for a person's roles (they can hold several; admin covers everything). */
export default function RolesField({ defaultRoles }: { defaultRoles: StaffRole[] }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className={FIELD_LABEL}>{SETTINGS_PAGE.rolesLabel}</legend>
      <div className="flex flex-col gap-1">
        {ALL_ROLES.map((role) => (
          <label key={role} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5 text-[13px] text-ink">
            <input type="checkbox" name="roles" value={role} defaultChecked={defaultRoles.includes(role)} className="mt-0.5 size-4 accent-accent" />
            <span>
              <span className="font-semibold capitalize">{role}</span>
              <span className="block text-xs text-muted">{ROLE_HELP[role]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
