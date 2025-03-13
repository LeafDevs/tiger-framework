import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Router } from "../build/router";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

describe("Tiger Router", () => {
  const testDir = "./test-pages";
  const router = new Router({
    pagesDir: testDir,
    distDir: "./test-dist"
  });

  // Set up test directory structure
  beforeAll(async () => {
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "about"), { recursive: true });
    await mkdir(join(testDir, "blog"), { recursive: true });

    // Create test pages
    await writeFile(
      join(testDir, "page.tiger"),
      'const Home = () => <view>Home</view>;'
    );
    await writeFile(
      join(testDir, "about/page.tiger"),
      'const About = () => <view>About</view>;'
    );
    await writeFile(
      join(testDir, "blog/page.tiger"),
      'const Blog = () => <view>Blog</view>;'
    );
  });

  // Clean up test directory
  afterAll(async () => {
    await rm(testDir, { recursive: true });
  });

  test("should initialize and find all pages", async () => {
    await router.initialize();
    const routes = router.getRoutes();

    expect(routes).toHaveLength(3);
    expect(routes.find(r => r.path === "/")).toBeTruthy();
    expect(routes.find(r => r.path === "/about")).toBeTruthy();
    expect(routes.find(r => r.path === "/blog")).toBeTruthy();
  });

  test("should get route by path", async () => {
    const homeRoute = router.getRoute("/");
    const aboutRoute = router.getRoute("/about");
    const blogRoute = router.getRoute("/blog");

    expect(homeRoute?.path).toBe("/");
    expect(aboutRoute?.path).toBe("/about");
    expect(blogRoute?.path).toBe("/blog");
  });

  test("should read page content", async () => {
    const homeRoute = router.getRoute("/");
    if (!homeRoute) throw new Error("Home route not found");

    const content = await router.getPageContent(homeRoute);
    expect(content).toContain("const Home = () =>");
    expect(content).toContain("<view>Home</view>");
  });

  test("should handle non-existent routes", () => {
    const nonExistentRoute = router.getRoute("/non-existent");
    expect(nonExistentRoute).toBeUndefined();
  });
}); 