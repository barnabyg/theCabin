import { build, context } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await copyFile("index.html", "dist/index.html");
const options = {
  entryPoints: { main: "src/main.ts", styles: "src/style.css" },
  bundle: true,
  outdir: "dist",
  target: "es2022",
  minify: true,
  logLevel: "info",
};
if (process.argv.includes("--serve")) {
  const bundler = await context(options);
  await bundler.watch();
  const port = Number(process.env.CABIN_PORT ?? 5173);
  await bundler.serve({ host: "127.0.0.1", port, servedir: "dist" });
  console.log(`The Cabin is ready at http://127.0.0.1:${port}`);
} else {
  const result = await build(options);
  if (result.warnings.length) process.exitCode = 1;
}
