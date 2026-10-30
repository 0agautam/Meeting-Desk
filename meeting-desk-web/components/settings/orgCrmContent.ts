/** Copy for the organisation's CRM connection card in Settings (admins only). */
export const ORG_CRM = {
  title: "Zoho CRM connection",
  lede: "One connection for the whole team. Hosts and the coordinator search clients and ABR people through it, so nobody else has to connect the CRM.",
  connectedAs: (email: string) => `Connected as ${email}`,
  needsReconnect: (email: string) => `Needs reconnecting (${email})`,
  notConnected: "Not connected",
  connect: "Connect Zoho CRM",
  reconnect: "Reconnect",
  disconnect: "Disconnect",
  help: "You'll approve on Zoho's own screen. Use a long-lived account (ideally a shared admin account), because CRM search stops for everyone if it is deactivated. Meeting Requests only reads contacts, leads and users; it never changes the CRM.",
  messages: {
    connected: { tone: "good", text: "Zoho CRM connected for the whole team. Its time zone and business hours were copied below if none were saved." },
    "connected-no-hours": { tone: "bad", text: "Zoho CRM connected, but its business hours couldn't be read. Set the time zone and hours below, or try Refresh from CRM." },
    disconnected: { tone: "good", text: "Zoho CRM disconnected. Nobody can search the CRM until it is connected again." },
    denied: { tone: "bad", text: "You didn't approve access, so nothing was connected." },
    state: { tone: "bad", text: "That approval didn't start from this page or took too long. Please click Connect again." },
    error: { tone: "bad", text: "Something went wrong while connecting. Please try again." },
    "not-configured": { tone: "bad", text: "Zoho isn't set up for this app yet (its Zoho client details are missing)." },
    datacentre: { tone: "bad", text: "That Zoho account is in a different region than this app supports." },
  } as Record<string, { tone: "good" | "bad"; text: string }>,
} as const;
