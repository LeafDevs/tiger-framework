import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { compileTigerToHTML } from './compiler';
import { generateResponsiveCSS } from './responsive';
import { Router } from './router';
import chalk from 'chalk';
import { ThreadPool } from './ThreadPool';

interface BuildStats {
  totalFiles: number;
  compiledFiles: number;
  errors: Array<{ file: string; error: string }>;
  startTime: number;
  endTime?: number;
}

async function buildPage(route: string, source: string, template: string, cssImports: string[]): Promise<string> {
  let html = await compileTigerToHTML(source);
  const responsiveCSS = generateResponsiveCSS(html);

  let finalHtml = template;
  if (cssImports.length > 0) {
    const cssLinks = cssImports
      .map(cssFile => `    <link rel="stylesheet" href="${cssFile}">`)
      .join('\n');
    finalHtml = finalHtml.replace('</head>', `${cssLinks}\n</head>`);
  }

  finalHtml = finalHtml.replace('</head>', `    <style>\n${responsiveCSS}\n    </style>\n</head>`);
  finalHtml = finalHtml.replace("{{content}}", html).replaceAll("{/*", "<!--").replaceAll("*/}", "-->");

  return finalHtml;
}

async function build() {
  const startTime = Date.now();

  try {
    const router = new Router({
      pagesDir: './src/pages',
      distDir: './dist'
    });
    await router.initialize();

    await mkdir('./dist', { recursive: true });
    const template = await readFile('./src/template.html', 'utf-8');

    const routes = router.getRoutes();
    for (const route of routes) {
      const source = await router.getPageContent(route);
      const cssImports = extractCSSImports(source);

      for (const cssFile of cssImports) {
        try {
          await copyFile(
            join('./src', cssFile),
            join('./dist', cssFile)
          );
        } catch (error) {
          console.error(chalk.red(`Failed to copy CSS file ${cssFile}`));
          process.exit(1);
        }
      }

      const finalHtml = await buildPage(route.path, source, template, cssImports);
      const outputPath = route.path === '/' 
        ? join('./dist', 'index.html')
        : join('./dist', route.path, 'index.html');

      await mkdir(join('./dist', route.path), { recursive: true });
      await writeFile(outputPath, finalHtml);
    }

    const totalTime = Date.now() - startTime;
    console.log(chalk.green(`\n✨ Build completed in ${totalTime}ms`));
    console.log(chalk.white(`   • Pages built: ${routes.length}`));

    process.exit(0);

  } catch (error) {
    console.error(chalk.red(`Build failed: ${error}`));
    process.exit(1);
  }
}

function extractCSSImports(source: string): string[] {
  const cssImports: string[] = [];
  const lines = source.split('\n');
  
  for (const line of lines) {
    const cssMatch = line.match(/import\s+['"]([^'"]+\.css)['"]/);
    if (cssMatch) {
      cssImports.push(cssMatch[1]);
    }
  }
  
  return cssImports;
}

export async function buildProject(srcDir: string, outDir: string): Promise<void> {
  const stats: BuildStats = {
    totalFiles: 0,
    compiledFiles: 0,
    errors: [],
    startTime: Date.now()
  };

  let threadPool: ThreadPool | null = null;

  try {
    threadPool = new ThreadPool();
    await mkdir(outDir, { recursive: true });
    
    const files = await getAllTigerFiles(srcDir);
    stats.totalFiles = files.length;

    const chunkSize = 10;
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      
      const fileContents = await Promise.all(
        chunk.map(async file => ({
          path: file,
          content: await readFile(file, 'utf-8')
        }))
      );

      const compilationPromises = fileContents.map(async ({ path, content }) => {
        try {
          const html = await threadPool!.compile(content);
          const outPath = join(outDir, path.replace(srcDir, '').replace('.tiger', '.html'));
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, html);
          stats.compiledFiles++;
        } catch (error) {
          stats.errors.push({
            file: path,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(compilationPromises);
    }

    stats.endTime = Date.now();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    console.log(chalk.cyan('\nBuild Complete'));
    console.log(chalk.blue(`Files: ${stats.totalFiles} | Success: ${stats.compiledFiles} | Failed: ${stats.errors.length} | Time: ${duration.toFixed(2)}s`));
    
    if (stats.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      stats.errors.forEach(({ file, error }) => {
        console.log(chalk.red(`  ${file}: ${error}`));
      });
    }

  } catch (error) {
    console.error(chalk.red(`Build failed: ${error}`));
    throw error;
  } finally {
    if (threadPool) {
      await threadPool.shutdown();
      threadPool = null;
    }
  }
}

async function getAllTigerFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  
  await Promise.all(
    entries.map(async entry => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await getAllTigerFiles(path));
      } else if (entry.name.endsWith('.tiger')) {
        files.push(path);
      }
    })
  );
  
  return files;
}

build(); 