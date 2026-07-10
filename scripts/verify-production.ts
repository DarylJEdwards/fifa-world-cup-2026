import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const target = args.find((argument) => !argument.startsWith("--")) ?? process.env.DEPLOYMENT_URL ?? process.env.PLAYWRIGHT_BASE_URL;
const mode = readOption("mode") ?? process.env.DEPLOYMENT_MODE ?? process.env.npm_config_mode;
const expectedSha = readOption("expected-sha") ?? process.env.EXPECTED_GIT_SHA ?? process.env.npm_config_expected_sha;
const minCompleted = readOption("min-completed") ?? process.env.MIN_COMPLETED_MATCHES ?? process.env.npm_config_min_completed;

if (!target) throw new Error("Missing deployed URL. Pass it as the first argument or set DEPLOYMENT_URL.");
if (mode !== "live" && mode !== "fallback") throw new Error("Pass --mode=live or --mode=fallback.");
if (expectedSha && !/^[a-f0-9]{7,40}$/i.test(expectedSha)) throw new Error("Invalid expected Git SHA.");

const baseUrl = normalizeUrl(target).toString();
const smokeArguments = ["run", "smoke:deployed", "--", baseUrl, `--mode=${mode}`];
if (expectedSha) smokeArguments.push(`--expected-sha=${expectedSha}`);
if (minCompleted) smokeArguments.push(`--min-completed=${minCompleted}`);

console.log(`productionVerificationBaseUrl=${baseUrl}`);
console.log(`productionVerificationMode=${mode}`);

await runNpm(smokeArguments);
await runNpm(["run", "test:browser"], { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl });

console.log("production verification passed");

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function normalizeUrl(value: string): URL {
  const url = new URL(value.startsWith("http") ? value : `https://${value}`);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function runNpm(npmArguments: string[], env = process.env): Promise<void> {
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const commandArguments = npmCli ? [npmCli, ...npmArguments] : npmArguments;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArguments, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`npm ${npmArguments.join(" ")} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? "unknown"}`}.`));
    });
  });
}
