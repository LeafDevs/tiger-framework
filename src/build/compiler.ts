import { as } from "./Types";
import type { MediaProps, VectorProps } from "./Types";
import { readFile } from "fs/promises";
import chalk from 'chalk';

// Type mapping for custom elements to HTML elements
const elementMap: Record<string, string> = {
  view: as.view,
  text: as.text,
  link: as.link,
  button: as.button,
  media: as.media,
  vector: as.vector,
};

// Allowed text elements for the 'as' prop
const allowedTextElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'em'];

// Media type mapping
const mediaTypeMap: Record<string, string> = {
  image: 'picture',
  video: 'video',
  audio: 'audio'
};

// Vector element mapping
const vectorElementMap: Record<string, string> = {
  vector: 'svg',
  path: 'path',
  circle: 'circle',
  rect: 'rect',
  line: 'line',
  polyline: 'polyline',
  polygon: 'polygon',
  g: 'g',
  defs: 'defs',
  gradient: 'linearGradient',
  stop: 'stop',
  animate: 'animate',
  animateTransform: 'animateTransform',
  use: 'use',
  symbol: 'symbol',
  mask: 'mask',
  clipPath: 'clipPath',
  text: 'text',
  tspan: 'tspan'
};

interface Token {
  type: 'TAG_OPEN' | 'TAG_CLOSE' | 'TEXT' | 'ATTRIBUTE' | 'JSX_FRAGMENT' | 'COMMENT';
  value: string;
  attributes?: Record<string, string>;
}

interface Node {
  type: string;
  attributes: Record<string, string>;
  children: Node[];
  text?: string;
}

// Function to process media attributes
function processMediaAttributes(attributes: Record<string, string>): Record<string, string> {
  const processedAttributes: Record<string, string> = { ...attributes };
  const mediaType = attributes.type || 'image';

  // Convert boolean attributes
  ['controls', 'autoplay', 'loop', 'muted'].forEach(attr => {
    if (attr in attributes) {
      processedAttributes[attr] = '';
    }
  });

  // Handle responsive images if it's a picture element
  if (mediaType === 'image' && attributes.srcset) {
    delete processedAttributes.src; // src will be handled by source/img children
  }

  return processedAttributes;
}

// Function to process vector attributes
async function processVectorAttributes(attributes: Record<string, string>): Promise<Record<string, string>> {
  const processedAttributes: Record<string, string> = { ...attributes };

  // Handle external SVG
  if (attributes.src) {
    try {
      const svgContent = await readFile(attributes.src, 'utf-8');
      processedAttributes['data-svg-content'] = svgContent;
    } catch (error) {
      console.error(chalk.red(`Failed to load SVG file: ${attributes.src}`));
    }
    delete processedAttributes.src;
  }

  // Convert numeric values to strings with units if needed
  ['width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'strokeWidth'].forEach(attr => {
    if (attr in attributes && !isNaN(Number(attributes[attr]))) {
      processedAttributes[attr] = attributes[attr] + 'px';
    }
  });

  // Handle viewBox attribute
  if (attributes.viewBox && !attributes.viewBox.includes(' ')) {
    const [x, y, width, height] = attributes.viewBox.split(',');
    processedAttributes.viewBox = `${x} ${y} ${width} ${height}`;
  }

  // Add default namespace for SVG elements
  if (attributes.as === 'vector') {
    processedAttributes.xmlns = 'http://www.w3.org/2000/svg';
  }

  return processedAttributes;
}

// Function to process attributes and add event handlers
function processAttributes(attributes: Record<string, string>): Record<string, string> {
  const processedAttributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      processedAttributes.class = value;
    } else if (key === 'to') {
      processedAttributes.href = value;
    } else if (key.startsWith('on')) {
      // Handle event handlers
      const eventName = key.toLowerCase().slice(2);
      processedAttributes[`data-event-${eventName}`] = value;
    } else if (key === 'type' && (attributes.as === 'media' || attributes.as === 'vector')) {
      // Skip type attribute for media and vector elements as it's handled separately
      continue;
    } else {
      processedAttributes[key] = value;
    }
  }

  return processedAttributes;
}

async function loadStylesheet(): Promise<string> {
  try {
    const css = await readFile('./src/App.css', 'utf-8');
    console.log(chalk.green(`   ✓ Loaded stylesheet (${chalk.blue(css.length)} bytes)`));
    return css;
  } catch (error) {
    console.error(chalk.red(`   ❌ Failed to load stylesheet: ${error}`));
    return '';
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let current = 0;
  let lineNumber = 1;
  let columnNumber = 1;
  let lastLogUpdate = Date.now();
  const updateInterval = 100;

  // Stats for logging
  let tagCount = 0;
  let textCount = 0;
  let commentCount = 0;

  // Debug logging function with source context
  const logDebug = (message: string, showContext = true) => {
    const contextStart = Math.max(0, current - 20);
    const contextEnd = Math.min(source.length, current + 20);
    const context = source.slice(contextStart, contextEnd);
    console.log(chalk.yellow(`\nDEBUG [L${lineNumber}:C${columnNumber}]: ${message}`));
    if (showContext) {
      console.log(chalk.gray('Context:'));
      console.log(chalk.gray(context));
      console.log(chalk.gray(' '.repeat(current - contextStart) + '^ Current position'));
    }
  };

  // Debug logging function
  const logToken = (type: string, value: string, attrs?: Record<string, string>) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const lineInfo = `[L${lineNumber}:C${columnNumber}]`;
    switch(type) {
      case 'TAG_OPEN':
        console.log(chalk.blue(`${timestamp} ${lineInfo} Found opening tag: <${value}>`));
        if (attrs && Object.keys(attrs).length > 0) {
          console.log(chalk.gray(`${' '.repeat(timestamp.length + lineInfo.length + 2)}Attributes:`));
          Object.entries(attrs).forEach(([key, val]) => {
            console.log(chalk.gray(`${' '.repeat(timestamp.length + lineInfo.length + 4)}${key}="${val}"`));
          });
        }
        break;
      case 'TAG_CLOSE':
        console.log(chalk.magenta(`${timestamp} ${lineInfo} Found closing tag: </${value}>`));
        break;
      case 'TEXT':
        const preview = value.length > 50 ? value.slice(0, 47) + '...' : value;
        console.log(chalk.green(`${timestamp} ${lineInfo} Found text content: "${preview}"`));
        break;
      case 'COMMENT':
        console.log(chalk.yellow(`${timestamp} ${lineInfo} Found comment: ${value}`));
        break;
      case 'JSX_FRAGMENT':
        console.log(chalk.cyan(`${timestamp} ${lineInfo} Found fragment: ${value}`));
        break;
    }
  };

  try {
    process.stdout.write('\r\x1b[K');
    console.log(chalk.cyan('\n🔍 Starting tokenization of source:'));
    console.log(chalk.gray('═'.repeat(80)));

    while (current < source.length) {
      const char = source[current];
      const now = Date.now();

      if (now - lastLogUpdate > updateInterval) {
        process.stdout.write(
          `\r${chalk.cyan('Progress:')} ${Math.floor((current / source.length) * 100)}% ` +
          chalk.gray(`[${current}/${source.length}] `) +
          chalk.blue(`Tags: ${tagCount}`) + ' | ' +
          chalk.green(`Text: ${textCount}`) + ' | ' +
          chalk.yellow(`Comments: ${commentCount}`)
        );
        lastLogUpdate = now;
      }

      if (/\s/.test(char)) {
        if (char === '\n') {
          lineNumber++;
          columnNumber = 1;
        } else {
          columnNumber++;
        }
        current++;
        continue;
      }

      // Handle tags
      if (char === '<') {
        logDebug('Found < character', false);
        
        if (source[current + 1] === '/') {
          // Closing tag
          current += 2;
          columnNumber += 2;
          let tagName = '';
          while (current < source.length && source[current] !== '>') {
            tagName += source[current];
            current++;
            columnNumber++;
          }
          if (current >= source.length) {
            throw new Error(`Unclosed closing tag: ${tagName}`);
          }
          current++;
          columnNumber++;
          const token = { type: 'TAG_CLOSE' as const, value: tagName };
          tokens.push(token);
          logToken(token.type, token.value);
          tagCount++;
          continue;
        }

        if (source.slice(current, current + 2) === '<>') {
          const token = { type: 'JSX_FRAGMENT' as const, value: '<>' };
          tokens.push(token);
          logToken(token.type, token.value);
          current += 2;
          columnNumber += 2;
          tagCount++;
          continue;
        }

        if (source.slice(current, current + 3) === '</>') {
          const token = { type: 'JSX_FRAGMENT' as const, value: '</>' };
          tokens.push(token);
          logToken(token.type, token.value);
          current += 3;
          columnNumber += 3;
          tagCount++;
          continue;
        }

        // Opening tag
        current++;
        columnNumber++;
        let tagName = '';
        const attributes: Record<string, string> = {};

        logDebug('Parsing opening tag', false);

        // Parse tag name
        while (current < source.length && !/[\s>\/]/.test(source[current])) {
          tagName += source[current];
          current++;
          columnNumber++;
        }

        // Parse attributes
        let isSelfClosing = false;
        while (current < source.length) {
          // Skip whitespace
          while (current < source.length && /\s/.test(source[current])) {
            if (source[current] === '\n') {
              lineNumber++;
              columnNumber = 1;
            } else {
              columnNumber++;
            }
            current++;
          }

          if (current >= source.length) {
            throw new Error(`Unexpected end of input while parsing tag: ${tagName}`);
          }

          // Check for self-closing tag
          if (source[current] === '/' && source[current + 1] === '>') {
            isSelfClosing = true;
            current += 2;
            columnNumber += 2;
            break;
          }

          // Check for end of tag
          if (source[current] === '>') {
            current++;
            columnNumber++;
            break;
          }

          // Parse attribute name
          let attrName = '';
          while (current < source.length && !/[\s=>"'\/]/.test(source[current])) {
            attrName += source[current];
            current++;
            columnNumber++;
          }

          // Skip whitespace before =
          while (current < source.length && /\s/.test(source[current])) {
            if (source[current] === '\n') {
              lineNumber++;
              columnNumber = 1;
            } else {
              columnNumber++;
            }
            current++;
          }

          // Handle self-closing tag without attributes
          if (source[current] === '/' && source[current + 1] === '>') {
            isSelfClosing = true;
            current += 2;
            columnNumber += 2;
            break;
          }

          if (current >= source.length) {
            throw new Error(`Unexpected end of input while parsing attribute: ${attrName}`);
          }

          // Expect =
          if (source[current] !== '=') {
            throw new Error(`Expected = after attribute name: ${attrName}`);
          }
          current++;
          columnNumber++;

          // Skip whitespace after =
          while (current < source.length && /\s/.test(source[current])) {
            if (source[current] === '\n') {
              lineNumber++;
              columnNumber = 1;
            } else {
              columnNumber++;
            }
            current++;
          }

          if (current >= source.length) {
            throw new Error(`Unexpected end of input while parsing attribute value: ${attrName}`);
          }

          // Parse attribute value
          let attrValue = '';
          if (source[current] === '"' || source[current] === "'") {
            const quote = source[current];
            current++;
            columnNumber++;

            while (current < source.length && source[current] !== quote) {
              if (source[current] === '\n') {
                lineNumber++;
                columnNumber = 1;
              } else {
                attrValue += source[current];
                columnNumber++;
              }
              current++;
            }

            if (current >= source.length) {
              throw new Error(`Unclosed quote in attribute value: ${attrName}="${attrValue}`);
            }

            current++; // Skip closing quote
            columnNumber++;
          } else {
            while (current < source.length && !/[\s>\/]/.test(source[current])) {
              attrValue += source[current];
              current++;
              columnNumber++;
            }
          }

          attributes[attrName] = attrValue;
          logDebug(`Found attribute: ${attrName}="${attrValue}"`, false);
        }

        const token = { type: 'TAG_OPEN' as const, value: tagName, attributes };
        tokens.push(token);
        logToken(token.type, token.value, token.attributes);
        tagCount++;

        // If self-closing tag, add the closing tag immediately
        if (isSelfClosing) {
          const closeToken = { type: 'TAG_CLOSE' as const, value: tagName };
          tokens.push(closeToken);
          logToken(closeToken.type, closeToken.value);
          tagCount++;
        }

        continue;
      }

      // Handle text content
      if (char !== '<' && char !== '>') {
        let text = '';
        while (current < source.length && source[current] !== '<') {
          text += source[current];
          current++;
          columnNumber++;
        }
        if (text.trim()) {
          const token = { type: 'TEXT' as const, value: text.trim() };
          tokens.push(token);
          logToken(token.type, token.value);
          textCount++;
        }
      }
    }

    console.log(chalk.gray('\n' + '═'.repeat(80)));
    console.log(chalk.cyan('✨ Tokenization complete!\n'));
    return tokens;
  } catch (error) {
    logDebug(`Error during tokenization: ${(error as unknown as Error).message}`);
    console.error(chalk.red('\nTokenization failed at:'));
    console.error(chalk.red(`Line ${lineNumber}, Column ${columnNumber}`));
    throw error;
  }
}

function parse(tokens: Token[]): Node {
  const root: Node = {
    type: 'root',
    attributes: {},
    children: []
  };

  let current = 0;
  let stack: Node[] = [root];

  while (current < tokens.length) {
    const token = tokens[current];

    switch (token.type) {
      case 'COMMENT': {
        const commentNode: Node = {
          type: 'comment',
          attributes: {},
          children: [],
          text: token.value
        };
        stack[stack.length - 1].children.push(commentNode);
        current++;
        break;
      }

      case 'TAG_OPEN': {
        const node: Node = {
          type: token.value,
          attributes: processAttributes(token.attributes || {}),
          children: []
        };

        if (node.type === 'text' && node.attributes.as && allowedTextElements.includes(node.attributes.as)) {
          node.type = node.attributes.as;
          delete node.attributes.as;
        }

        if (elementMap[node.type]) {
          node.type = elementMap[node.type];
        }

        stack[stack.length - 1].children.push(node);
        stack.push(node);
        current++;
        break;
      }

      case 'TAG_CLOSE': {
        if (stack.length > 1) {
          stack.pop();
        }
        current++;
        break;
      }

      case 'TEXT': {
        stack[stack.length - 1].children.push({
          type: 'text',
          attributes: {},
          children: [],
          text: token.value
        });
        current++;
        break;
      }

      case 'JSX_FRAGMENT': {
        if (token.value === '<>') {
          const fragment: Node = {
            type: 'fragment',
            attributes: {},
            children: []
          };
          stack[stack.length - 1].children.push(fragment);
          stack.push(fragment);
        } else {
          if (stack.length > 1) {
            stack.pop();
          }
        }
        current++;
        break;
      }
    }
  }

  return root;
}

function generateHTML(node: Node, css: string, indent = 0): string {
  let html = '';
  const spaces = '  '.repeat(indent);

  if (node.type === 'text') {
    return `${spaces}${node.text}\n`;
  }

  if (node.type === 'comment') {
    return `${spaces}<!-- ${node.text} -->\n`;
  }

  if (node.type === 'fragment') {
    return node.children.map(child => generateHTML(child, css, indent)).join('');
  }

  const attributes = Object.entries(node.attributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');

  if (node.type === 'media') {
    const mediaType = node.attributes.type || 'image';
    const elementType = mediaTypeMap[mediaType];
    
    if (elementType === 'picture') {
      html += `${spaces}<picture${attributes}>\n`;
      node.children.forEach(child => {
        html += generateHTML(child, css, indent + 1);
      });
      html += `${spaces}</picture>\n`;
    } else {
      html += `${spaces}<${elementType}${attributes}>\n`;
      node.children.forEach(child => {
        html += generateHTML(child, css, indent + 1);
      });
      html += `${spaces}</${elementType}>\n`;
    }
    return html;
  }

  if (node.type === 'vector' || node.type in vectorElementMap) {
    const elementType = vectorElementMap[node.type] || 'svg';
    
    if (node.attributes['data-svg-content']) {
      // For external SVGs loaded via src attribute
      const svgContent = node.attributes['data-svg-content'];
      delete node.attributes['data-svg-content'];
      
      // Extract the SVG content between <svg> tags
      const svgMatch = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
      if (svgMatch) {
        const [_, innerContent] = svgMatch;
        html += `${spaces}<${elementType}${attributes}>\n`;
        html += `${spaces}  ${innerContent.trim()}\n`;
        html += `${spaces}</${elementType}>\n`;
      } else {
        html += `${spaces}<${elementType}${attributes}>\n`;
        html += `${spaces}  ${svgContent.trim()}\n`;
        html += `${spaces}</${elementType}>\n`;
      }
    } else {
      // For inline SVG content
      html += `${spaces}<${elementType}${attributes}>\n`;
      node.children.forEach(child => {
        html += generateHTML(child, css, indent + 1);
      });
      html += `${spaces}</${elementType}>\n`;
    }
    return html;
  }

  html += `${spaces}<${node.type}${attributes}>\n`;

  for (const child of node.children) {
    html += generateHTML(child, css, indent + 1);
  }

  html += `${spaces}</${node.type}>\n`;
  return html;
}

export async function compileTigerToHTML(source: string): Promise<string> {
  process.stdout.write('\r\x1b[K'); // Clear current line
  console.log(chalk.cyan('🔄 Starting Tiger compilation...'));

  try {
    // Load stylesheet
    const css = await loadStylesheet();
    
    // Extract JSX content
    process.stdout.write('\r\x1b[KExtracting JSX content...');
    const jsxMatch = source.match(/return\s*\(\s*([\s\S]*?)\s*\);/);
    if (!jsxMatch) {
      console.log(chalk.red('\n❌ No JSX content found in source'));
      console.log(chalk.gray('Source preview:'), source.slice(0, 100) + '...');
      return '';
    }
    console.log(chalk.green('\n✓ JSX content extracted'));

    // Tokenize
    process.stdout.write('\r\x1b[KTokenizing JSX...');
    const jsxContent = jsxMatch[1];
    const tokens = tokenize(jsxContent);
    console.log(chalk.green('\n✓ Tokenization complete'));
    console.log(chalk.gray(`  Found ${tokens.length} tokens`));

    // Parse
    process.stdout.write('\r\x1b[KParsing tokens to AST...');
    const ast = parse(tokens);
    console.log(chalk.green('\n✓ Parsing complete'));
    console.log(chalk.gray(`  Generated AST with ${ast.children.length} root children`));

    // Generate HTML
    process.stdout.write('\r\x1b[KGenerating HTML...');
    const html = generateHTML(ast, css);
    const lines = html.split('\n').length;
    console.log(chalk.green('\n✓ HTML generation complete'));
    console.log(chalk.gray(`  Generated ${lines} lines of HTML`));

    // Final stats
    console.log(chalk.cyan('\n📊 Compilation Stats:'));
    console.log(chalk.gray(`  • Source size: ${source.length} bytes`));
    console.log(chalk.gray(`  • Tokens: ${tokens.length}`));
    console.log(chalk.gray(`  • AST nodes: ${countNodes(ast)}`));
    console.log(chalk.gray(`  • Output size: ${html.length} bytes`));
    
    return html;
  } catch (error) {
    console.error(chalk.red('\n❌ Compilation failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

// Helper function to count total nodes in AST
function countNodes(node: Node): number {
  let count = 1; // Count current node
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}