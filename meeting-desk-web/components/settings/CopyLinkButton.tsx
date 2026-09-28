"use client";

import { useState } from "react";
import { SETTINGS_PAGE } from "./settingsContent";

/** Wireframe 4's "Copy link" — copies the full booking URL to the clipboard. */
export default function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the link is still visible in the table to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-8 items-center rounded-field border border-field-line bg-card px-3 text-xs font-semibold text-ink hover:bg-ground"
    >
      {copied ? SETTINGS_PAGE.copied : SETTINGS_PAGE.copyLink}
    </button>
  );
}
