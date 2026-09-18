import { copyFileSync } from "node:fs";
copyFileSync("src/api/schema.d.ts", "dist/api/schema.d.ts");
