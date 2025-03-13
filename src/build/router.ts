import { readdir, readFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import chalk from 'chalk';

interface Route {
  path: string;
  filePath: string;
}

interface RouterConfig {
  pagesDir: string;
  distDir: string;
}

export class Router {
  private routes: Route[] = [];
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  // Scan directory recursively for page.tiger files
  private async scanDirectory(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.name === 'page.tiger') {
        // Calculate route path based on directory structure
        const relativePath = relative(this.config.pagesDir, dirname(fullPath));
        const routePath = relativePath === '' ? '/' : `/${relativePath}`;
        
        this.routes.push({
          path: routePath,
          filePath: fullPath
        });
        
        console.log(chalk.blue(`   📄 Found page: ${routePath} -> ${fullPath}`));
      }
    }
  }

  // Initialize router and discover routes
  async initialize(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Scanning for pages...'));
    await this.scanDirectory(this.config.pagesDir);
    console.log(chalk.green(`\n✓ Found ${this.routes.length} pages`));
  }

  // Get all discovered routes
  getRoutes(): Route[] {
    return this.routes;
  }

  // Get route by path
  getRoute(path: string): Route | undefined {
    return this.routes.find(route => route.path === path);
  }

  // Read the content of a route's page file
  async getPageContent(route: Route): Promise<string> {
    try {
      return await readFile(route.filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read page content: ${error}`);
    }
  }
} 