export interface IdentityFont {
  id: string;
  display: string;
  body: string;
  mono: string;
  google_fonts_url: string;
  stack_display: string;
  stack_body: string;
  stack_mono: string;
}

export interface IdentityPalette {
  id: string;
  hue: number;
  neutral_family: string;
  accent: string;
  accent_dark: string;
  surface: string;
  surface_alt: string;
  fg: string;
  fg_muted: string;
  border: string;
  surface_dark: string;
  surface_alt_dark: string;
  fg_dark: string;
  fg_muted_dark: string;
  border_dark: string;
}

export interface IdentityLayout {
  id: "magazine" | "dashboard" | "feed" | "directory" | "longform" | "kiosk";
  component: string;
  component_path: string;
  density: "loose" | "normal" | "dense";
  brief: string;
}

export interface IdentityVoice {
  id: string;
  label_latest: string;
  label_recent: string;
  label_featured: string;
  label_more: string;
  nav_posts: string;
  nav_about: string;
  cta_subscribe: string;
  cta_subscribe_desc: string;
  cta_button: string;
  site_motto: string;
}

export interface Identity {
  font: IdentityFont;
  palette: IdentityPalette;
  layout: IdentityLayout;
  voice: IdentityVoice;
}

export const identity: Identity = {
  "font": {
    "id": "f06_serif_crimson_workssans",
    "display": "Crimson Pro",
    "body": "Work Sans",
    "mono": "JetBrains Mono",
    "google_fonts_url": "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    "stack_display": "\"Crimson Pro\", \"Iowan Old Style\", Georgia, serif",
    "stack_body": "\"Work Sans\", \"Helvetica Neue\", system-ui, sans-serif",
    "stack_mono": "\"JetBrains Mono\", ui-monospace, monospace"
  },
  "palette": {
    "id": "p04_h45_warm",
    "hue": 45,
    "neutral_family": "warm",
    "accent": "199 155 26",
    "accent_dark": "241 202 85",
    "surface": "255 253 250",
    "surface_alt": "253 250 242",
    "fg": "38 30 18",
    "fg_muted": "120 100 72",
    "border": "232 222 200",
    "surface_dark": "22 18 12",
    "surface_alt_dark": "34 28 20",
    "fg_dark": "248 242 228",
    "fg_muted_dark": "180 168 140",
    "border_dark": "60 50 36"
  },
  "layout": {
    "id": "feed",
    "component": "HomeNewspaper",
    "component_path": "@components/clusters/HomeNewspaper.astro",
    "density": "dense",
    "brief": "Newspaper-style feed: dense single-column with sidebar digest."
  },
  "voice": {
    "id": "v02_news",
    "label_latest": "On the wire",
    "label_recent": "More incidents",
    "label_featured": "Top story",
    "label_more": "Continue reading",
    "nav_posts": "Stories",
    "nav_about": "Newsroom",
    "cta_subscribe": "The daily brief",
    "cta_subscribe_desc": "One email a day. Incidents, breaches, advisories.",
    "cta_button": "Get the brief",
    "site_motto": "Daily AI security reporting."
  }
} as const;
