import { execFile, spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import { sendMessage } from "./telegram.js";

const CHANGELOG_URL =
  "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md";
const DATA_DIR = join(import.meta.dirname, "..", "data");
const STORED_PATH = join(DATA_DIR, "CHANGELOG.md");

const execFileAsync = promisify(execFile);

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

export async function fetchChangelog(): Promise<string> {
  log("Fetching changelog from GitHub...");
  const response = await fetch(CHANGELOG_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch changelog: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

export async function getStoredChangelog(): Promise<string | null> {
  try {
    return await readFile(STORED_PATH, "utf-8");
  } catch {
    return null;
  }
}

export async function saveChangelog(content: string): Promise<void> {
  await writeFile(STORED_PATH, content, "utf-8");
  log("Changelog saved to disk.");
}

export async function getDiff(
  oldContent: string,
  newContent: string,
): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), "changelog-diff-"));
  const oldFile = join(tmpDir, "old.md");
  const newFile = join(tmpDir, "new.md");

  try {
    await writeFile(oldFile, oldContent, "utf-8");
    await writeFile(newFile, newContent, "utf-8");

    const { stdout } = await execFileAsync("diff", ["-u", oldFile, newFile]);
    return stdout;
  } catch (error: unknown) {
    // diff exits with code 1 when files differ — this is expected
    const err = error as { code?: number; stdout?: string };
    if (err.code === 1 && typeof err.stdout === "string") {
      return err.stdout;
    }
    throw error;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function summarizeDiff(diff: string): Promise<string> {
  log("Summarizing diff with Claude...");

  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      "claude",
      [
        "-p",
        "你是 Claude Code changelog 摘要助手。請閱讀以下 diff，用繁體中文（zh-TW）摘要版本變更重點。格式簡潔，使用條列式。",
      ],
      {
        env: { ...process.env, CLAUDE_CODE_SIMPLE: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `claude process exited with code ${code}: ${stderr}`,
          ),
        );
        return;
      }
      resolve(stdout.trim());
    });

    child.on("error", (err: Error) => {
      reject(err);
    });

    child.stdin.write(diff);
    child.stdin.end();
  });
}

export async function checkAndNotify(): Promise<void> {
  log("Starting changelog check...");

  const newContent = await fetchChangelog();
  const storedContent = await getStoredChangelog();

  if (storedContent === null) {
    log("No stored changelog found. Saving initial copy.");
    await saveChangelog(newContent);
    return;
  }

  if (newContent === storedContent) {
    log("No changes detected in changelog.");
    return;
  }

  log("Changes detected! Computing diff...");
  const diff = await getDiff(storedContent, newContent);

  const summary = await summarizeDiff(diff);

  const message = `📋 Claude Code Changelog 更新\n\n${summary}`;
  await sendMessage(message);

  await saveChangelog(newContent);
  log("Changelog check complete. Notification sent.");
}
