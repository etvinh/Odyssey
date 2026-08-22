import { writeFile } from "node:fs/promises";
import { createApp } from "../src/app.js";

const doc = createApp().getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "Odyssey API", version: "1.0.0" },
  servers: [{ url: "http://localhost:8787" }],
});

// Tracked in git, not a build artifact: the contract should be readable on
// GitHub without cloning, same reasoning as the committed Orval output.
await writeFile("./openapi.json", JSON.stringify(doc, null, 2) + "\n");
console.log(`openapi.json written — ${Object.keys(doc.paths ?? {}).length} path(s)`);
