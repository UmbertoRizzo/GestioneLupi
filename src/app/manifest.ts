import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GestioneLupi",
    short_name: "GestioneLupi",
    description: "Richieste e documenti scout, in ordine.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#b4232f",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
