// Links shared by the header and footer.

// The simulator is its own app (apps/simulator) on a subdomain. Override with PUBLIC_SIMULATOR_URL.
export const SIMULATOR_URL: string =
  import.meta.env.PUBLIC_SIMULATOR_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "https://simulator.stemgrid.in");

export const PHONE = { href: "tel:+918925172636", label: "+91 89251 72636" };
