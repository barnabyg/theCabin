import { build, context } from "esbuild";
import { execFile } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await copyFile("index.html", "dist/index.html");
const options = {
  entryPoints: { main: "src/main.ts", styles: "src/style.css" },
  bundle: true,
  outdir: "dist",
  loader: { ".webp": "file" },
  assetNames: "art/[name]-[hash]",
  target: "es2022",
  minify: true,
  logLevel: "info",
};
if (process.argv.includes("--serve")) {
  const bundler = await context(options);
  await bundler.watch();
  const port = Number(process.env.CABIN_PORT ?? 5173);
  const server = await bundler.serve({ host: "127.0.0.1", port, servedir: "dist" });
  const url = `http://127.0.0.1:${server.port}`;
  console.log(`The Cabin is ready at ${url}`);
  if (process.platform === "win32" && process.env.CABIN_OPEN_BROWSER === "1") {
    execFile("rundll32.exe", ["url.dll,FileProtocolHandler", url], (error) => {
      if (error) console.log(`Open ${url} in your browser to play.`);
    });
  }
} else {
  const result = await build(options);
  if (result.warnings.length) process.exitCode = 1;
}
