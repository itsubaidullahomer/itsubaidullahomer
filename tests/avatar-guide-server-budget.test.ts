import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { RESERVE_GUIDE_TURN } from "../lib/avatar-guide-server/policy";
import { UNLOCK } from "../lib/chatgpt/security";
const exec = promisify(execFile);
const available =
  spawnSync("redis-server", ["--version"]).status === 0 &&
  spawnSync("redis-cli", ["--version"]).status === 0;
test(
  "Redis reservations enforce atomic session/global budgets, parallel request locks and expiry",
  { skip: !available },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), "avatar-budget-"));
    const socket = join(folder, "redis.sock");
    const server = spawn(
      "redis-server",
      [
        "--port",
        "0",
        "--unixsocket",
        socket,
        "--save",
        "",
        "--appendonly",
        "no",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Redis startup timed out")),
          5000,
        );
        server.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        server.stdout.on("data", (chunk) => {
          if (String(chunk).toLowerCase().includes("ready to accept connections")) {
            clearTimeout(timeout);
            resolve();
          }
        });
        server.once("exit", () => {
          clearTimeout(timeout);
          reject(new Error("Redis stopped"));
        });
      });
      const redis = async (...args: string[]) =>
        (
          await exec("redis-cli", ["-s", socket, "--raw", ...args])
        ).stdout.trim();
      const reserve = (id: string, owner: string, amount: number) =>
        redis(
          "EVAL",
          RESERVE_GUIDE_TURN,
          "6",
          `session:${id}`,
          `lock:${id}`,
          "ip",
          `turns:${id}`,
          `budget:${id}`,
          "daily",
          owner,
          "20",
          "10",
          String(amount),
          "50",
          "80",
        );
      await redis("SET", "session:a", "yes", "EX", "900");
      assert.equal(await reserve("a", "owner-a", 30), "ok");
      assert.equal(await reserve("a", "owner-b", 1), "busy");
      assert.equal(await redis("EVAL", UNLOCK, "1", "lock:a", "owner-b"), "0");
      assert.equal(await redis("EVAL", UNLOCK, "1", "lock:a", "owner-a"), "1");
      assert.equal(await reserve("a", "owner-c", 30), "budget");
      assert.equal(await redis("GET", "budget:a"), "30");
      assert.equal(await redis("GET", "turns:a"), "1");
      assert.equal(await reserve("a", "owner-c", 20), "ok");
      await redis("SET", "session:b", "yes", "EX", "900");
      assert.equal(await reserve("b", "owner-d", 31), "budget");
      assert.equal(await reserve("missing", "owner-e", 0), "expired");
      const results = await Promise.all([
        reserve("b", "race-1", 10),
        reserve("b", "race-2", 10),
      ]);
      assert.deepEqual(results.sort(), ["busy", "ok"]);
      assert.equal(await redis("GET", "daily"), "60");
    } finally {
      server.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (server.exitCode !== null) resolve();
        else server.once("exit", () => resolve());
      });
      await rm(folder, { recursive: true, force: true });
    }
  },
);
