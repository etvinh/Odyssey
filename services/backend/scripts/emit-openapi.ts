import { writeFile, mkdir } from "node:fs/promises";
import { createApp } from "../src/app.js";

const doc = createApp().getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "Odyssey API", version: "1.0.0" },
  servers: [{ url: "http://localhost:8787" }],
});

await mkdir("./dist", { recursive: true });
await writeFile("./dist/openapi.json", JSON.stringify(doc, null, 2));
console.log(`openapi.json written — ${Object.keys(doc.paths ?? {}).length} path(s)`);
