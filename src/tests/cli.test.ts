import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

describe("Tiger CLI", () => {
  const testDir = "./test-project";

  // Set up test project
  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "src"), { recursive: true });
    await mkdir(join(testDir, "src/pages"), { recursive: true });

    // Create test files
    await writeFile(
      join(testDir, "src/pages/page.tiger"),
      'const Home = () => <view>Test Home</view>;'
    );

    await writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        type: "module",
        scripts: {
          "dev": "tiger dev",
          "build": "tiger build",
          "serve": "tiger serve"
        }
      })
    );
  });

  // Clean up test project
  afterAll(async () => {
    await rm(testDir, { recursive: true });
  });

  test("should execute build command", async () => {
    process.chdir(testDir);
    const { stdout, stderr } = await execAsync("tiger build");
    
    expect(stderr).toBe("");
    expect(stdout).toContain("Building project for production");
    expect(stdout).toContain("Project built successfully");
  });

  test("should handle invalid command", async () => {
    process.chdir(testDir);
    try {
      await execAsync("tiger invalid-command");
    } catch (error: any) {
      expect(error.stderr).toContain("Unknown command");
    }
  });

  test("should show help information", async () => {
    process.chdir(testDir);
    const { stdout } = await execAsync("tiger --help");
    
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("Commands:");
    expect(stdout).toContain("Options:");
  });

  test("should show version information", async () => {
    process.chdir(testDir);
    const { stdout } = await execAsync("tiger --version");
    
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
}); 