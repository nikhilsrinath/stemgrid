// Links shared by the header and footer.

// The simulator is its own app (apps/simulator) on a subdomain. Override with PUBLIC_SIMULATOR_URL.
export const SIMULATOR_URL: string =
  import.meta.env.PUBLIC_SIMULATOR_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "https://simulator.stemgrid.in");

export const PHONE = { href: "tel:+918925172636", label: "+91 89251 72636" };

// The business contact form posts to the simulator's API (this site is static).
export const CONTACT_ENDPOINT = `${SIMULATOR_URL}/api/contact`;
