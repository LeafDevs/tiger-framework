import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { join } from 'path';
import { compileTigerToHTML } from './compiler';
import { generateResponsiveCSS } from './responsive';
import { Router } from './router';
import chalk from 'chalk';
import ora from 'ora';

// Create a progress spinner
const spinner = ora({
  text: 'Initializing build process...',
  color: 'cyan',
  spinner: 'dots',
  stream: process.stdout
});

// Function to update spinner text and show it
function updateProgress(text: string) {
  spinner.text = text;
  spinner.start();
}

// Function to log with color
const log = {
  info: (text: string) => {
    spinner.stop();
    console.log(chalk.cyan(`\nℹ️  ${text}`));
    spinner.start();
  },
  success: (text: string) => {
    spinner.stop();
    console.log(chalk.green(`\n✓ ${text}`));
    spinner.start();
  },
  error: (text: string) => {
    spinner.stop();
    console.log(chalk.red(`\n❌ ${text}`));
    spinner.start();
  },
  warning: (text: string) => {
    spinner.stop();
    console.log(chalk.yellow(`\n⚠️  ${text}`));
    spinner.start();
  }
};

// Function to extract CSS imports from Tiger file
function extractCSSImports(source: string): string[] {
  const cssImports: string[] = [];
  const lines = source.split('\n');
  
  for (const line of lines) {
    // Look for import statements with .css files
    const cssMatch = line.match(/import\s+['"]([^'"]+\.css)['"]/);
    if (cssMatch) {
      cssImports.push(cssMatch[1]);
    }
  }
  
  return cssImports;
}

async function buildPage(route: string, source: string, template: string, cssImports: string[]): Promise<string> {
  // Compile Tiger to HTML
  updateProgress(`Compiling ${route} to HTML...`);
  let html: string;
  
  try {
    html = await compileTigerToHTML(source);
    log.success(`Compiled ${route}`);
  } catch (error) {
    log.error(`Compilation failed for ${route}: ${error}`);
    throw error;
  }

  // Generate responsive styles
  updateProgress(`Generating responsive styles for ${route}...`);
  const responsiveCSS = generateResponsiveCSS(html);
  log.success(`Generated responsive styles for ${route}`);

  // Add CSS link tags to head
  let finalHtml = template;
  if (cssImports.length > 0) {
    const cssLinks = cssImports
      .map(cssFile => `    <link rel="stylesheet" href="${cssFile}">`)
      .join('\n');
    finalHtml = finalHtml.replace('</head>', `${cssLinks}\n</head>`);
  }

  // Add responsive styles
  finalHtml = finalHtml.replace('</head>', `    <style>\n${responsiveCSS}\n    </style>\n</head>`);

  // Replace content
  updateProgress(`Injecting compiled content for ${route}...`);
  finalHtml = finalHtml.replace("{{content}}", html).replaceAll("{/*", "<!--").replaceAll("*/}", "-->");
  log.success(`Generated final HTML for ${route}`);

  return finalHtml;
}

async function build() {
  console.log(chalk.cyan('\n🚀 Starting Tiger Build Process...\n'));
  const startTime = Date.now();

  try {
    // Initialize router
    const router = new Router({
      pagesDir: './src/pages',
      distDir: './dist'
    });
    await router.initialize();

    // Create dist directory if it doesn't exist
    try {
      updateProgress('Creating dist directory...');
      await mkdir('./dist', { recursive: true });
      log.success('Created/Verified dist directory');
    } catch (error) {
      log.error(`Failed to create dist directory: ${error}`);
      process.exit(1);
    }

    // Read template
    updateProgress('Reading HTML template...');
    const template = await readFile('./src/template.html', 'utf-8');
    log.success(`Template size: ${chalk.blue(template.length)} bytes`);

    // Build each page
    const routes = router.getRoutes();
    for (const route of routes) {
      updateProgress(`Processing ${route.path}...`);
      
      // Read source file
      const source = await router.getPageContent(route);
      log.success(`Read ${route.path} (${chalk.blue(source.length)} bytes)`);

      // Extract CSS imports
      const cssImports = extractCSSImports(source);
      if (cssImports.length > 0) {
        log.info(`Found ${chalk.blue(cssImports.length)} CSS imports for ${route.path}`);
        
        // Copy CSS files to dist
        for (const cssFile of cssImports) {
          updateProgress(`Copying CSS file: ${cssFile}...`);
          try {
            await copyFile(
              join('./src', cssFile),
              join('./dist', cssFile)
            );
            log.success(`Copied ${cssFile} to dist folder`);
          } catch (error) {
            log.error(`Failed to copy CSS file ${cssFile}: ${error}`);
            process.exit(1);
          }
        }
      }

      // Build the page
      const finalHtml = await buildPage(route.path, source, template, cssImports);

      // Write output
      const outputPath = route.path === '/' 
        ? join('./dist', 'index.html')
        : join('./dist', route.path, 'index.html');

      // Create directory for the route if needed
      await mkdir(join('./dist', route.path), { recursive: true });
      
      updateProgress(`Writing ${route.path} to ${outputPath}...`);
      await writeFile(outputPath, finalHtml);
      log.success(`Successfully wrote ${route.path} to ${outputPath}`);
    }

    const totalTime = Date.now() - startTime;
    spinner.stop();
    console.log(chalk.green(`\n✨ Build completed in ${chalk.blue(totalTime)}ms`));
    console.log(chalk.cyan('\n📊 Build Statistics:'));
    console.log(chalk.white(`   • Pages built: ${chalk.blue(routes.length)}`));
    console.log(chalk.white(`   • Total build time: ${chalk.blue(totalTime)}ms\n`));

    // Exit successfully
    process.exit(0);

  } catch (error) {
    spinner.stop();
    log.error(`Build failed: ${error}`);
    process.exit(1);
  }
}

build(); 