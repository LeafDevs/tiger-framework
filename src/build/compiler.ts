import { as } from "./Types";
import { readFile } from "fs/promises";
import chalk from 'chalk';

// Type mapping for custom elements to HTML elements
const elementMap: Record<string, string> = {
  view: as.view,
  text: as.text,
  link: as.link,
  button: as.button,
};

// Allowed text elements for the 'as' prop
const allowedTextElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'em'];

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

// Function to process attributes and add event handlers
function processAttributes(attributes: Record<string, string>): Record<string, string> {
  const processed: Record<string, string> = { ...attributes };

  // Handle className
  if (processed.className) {
    processed.class = processed.className;
    delete processed.className;
  }

  // Handle bind attribute for buttons
  if (processed.bind) {
    processed.onclick = `(${processed.bind})()`;
    delete processed.bind;
  }

  // Handle to attribute for links
  if (processed.to) {
    processed.href = processed.to;
    delete processed.to;
  }

  return processed;
}

async function loadStylesheet(): Promise<string> {
  try {
    console.log(chalk.cyan(`   ⚙️  Loading stylesheet...`));
    const css = await readFile('./src/stylesheet.css', 'utf-8');
    console.log(chalk.green(`   ✓ Loaded stylesheet (${chalk.blue(css.length)} bytes)`));
    return css;
  } catch (error) {
    console.error(chalk.red(`   ❌ Failed to load stylesheet: ${error}`));
    return '';
  }
}

function tokenize(source: string): Token[] {
  console.log(chalk.cyan(`   ⚙️  Starting tokenization...`));
  console.log(chalk.blue(`   📝 Source length: ${source.length} characters`));
  
  const tokens: Token[] = [];
  let current = 0;
  let buffer = '';
  let lineNumber = 1;
  let columnNumber = 1;

  while (current < source.length) {
    const char = source[current];
    
    // Log position every 100 characters
    if (current % 100 === 0) {
      console.log(chalk.blue(`   📍 Position: ${current}/${source.length} (${Math.round((current/source.length) * 100)}%)`));
    }

    // Skip whitespace and newlines
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

    // Handle JSX comments in format {/* comment */}
    if (source.slice(current, current + 4) === '{/*') {
      console.log(chalk.blue(`   🔍 Found JSX comment at line ${lineNumber}, column ${columnNumber}`));
      current += 4; // Skip {/*
      columnNumber += 4;
      let comment = '';
      
      while (current < source.length && source.slice(current, current + 3) !== '*/}') {
        comment += source[current];
        current++;
        columnNumber++;
      }
      
      current += 3; // Skip */}
      columnNumber += 3;
      tokens.push({ type: 'COMMENT', value: comment.trim() });
      continue;
    }

    // Handle HTML comments in format {/* comment */}
    if (source.slice(current, current + 4) === '{/*') {
      console.log(chalk.blue(`   🔍 Found HTML comment at line ${lineNumber}, column ${columnNumber}`));
      current += 4; // Skip {/*
      columnNumber += 4;
      let comment = '';
      
      while (current < source.length && source.slice(current, current + 3) !== '*/}') {
        comment += source[current];
        current++;
        columnNumber++;
      }
      
      current += 3; // Skip */}
      columnNumber += 3;
      tokens.push({ type: 'COMMENT', value: comment.trim() });
      continue;
    }

    // Handle JSX fragments
    if (source.slice(current, current + 2) === '<>') {
      console.log(chalk.blue(`   🔍 Found JSX fragment at line ${lineNumber}, column ${columnNumber}`));
      tokens.push({ type: 'JSX_FRAGMENT', value: '<>' });
      current += 2;
      columnNumber += 2;
      continue;
    }

    if (source.slice(current, current + 3) === '</>') {
      console.log(chalk.blue(`   🔍 Found closing JSX fragment at line ${lineNumber}, column ${columnNumber}`));
      tokens.push({ type: 'JSX_FRAGMENT', value: '</>' });
      current += 3;
      columnNumber += 3;
      continue;
    }

    // Handle opening tags
    if (char === '<' && source[current + 1] !== '/') {
      console.log(chalk.blue(`   🔍 Found opening tag at line ${lineNumber}, column ${columnNumber}`));
      current++; // Skip <
      columnNumber++;
      let tagName = '';
      const attributes: Record<string, string> = {};

      // Get tag name
      while (current < source.length && !/\s/.test(source[current]) && source[current] !== '>') {
        tagName += source[current];
        current++;
        columnNumber++;
      }

      console.log(chalk.blue(`   📌 Found tag name: ${tagName}`));

      // Get attributes
      while (current < source.length && source[current] !== '>') {
        if (source[current] === ' ') {
          current++;
          columnNumber++;
          continue;
        }

        let attrName = '';
        while (current < source.length && source[current] !== '=' && !/\s/.test(source[current])) {
          attrName += source[current];
          current++;
          columnNumber++;
        }

        if (source[current] === '=') {
          current++; // Skip =
          columnNumber++;
          current++; // Skip opening quote
          columnNumber++;
          let attrValue = '';
          while (current < source.length && source[current] !== '"' && source[current] !== "'") {
            attrValue += source[current];
            current++;
            columnNumber++;
          }
          current++; // Skip closing quote
          columnNumber++;
          attributes[attrName] = attrValue;
          console.log(chalk.blue(`   📌 Found attribute: ${attrName}="${attrValue}"`));
        }
      }

      current++; // Skip >
      columnNumber++;
      tokens.push({ type: 'TAG_OPEN', value: tagName, attributes });
      continue;
    }

    // Handle closing tags
    if (char === '<' && source[current + 1] === '/') {
      console.log(chalk.blue(`   🔍 Found closing tag at line ${lineNumber}, column ${columnNumber}`));
      current += 2; // Skip </
      columnNumber += 2;
      let tagName = '';
      while (current < source.length && source[current] !== '>') {
        tagName += source[current];
        current++;
        columnNumber++;
      }
      current++; // Skip >
      columnNumber++;
      tokens.push({ type: 'TAG_CLOSE', value: tagName });
      console.log(chalk.blue(`   📌 Found closing tag name: ${tagName}`));
      continue;
    }

    // Handle text content
    if (char !== '<' && char !== '>') {
      let text = '';
      let textStart = current;
      while (current < source.length && source[current] !== '<') {
        text += source[current];
        current++;
        columnNumber++;
      }
      if (text.trim()) {
        console.log(chalk.blue(`   📝 Found text content at line ${lineNumber}, column ${columnNumber - text.length}: "${text.trim()}"`));
        tokens.push({ type: 'TEXT', value: text.trim() });
      }
    }
  }

  console.log(chalk.green(`   ✓ Tokenization complete. Generated ${chalk.blue(tokens.length)} tokens`));
  console.log(chalk.blue(`   📊 Token breakdown:`));
  console.log(chalk.blue(`      • Opening tags: ${tokens.filter(t => t.type === 'TAG_OPEN').length}`));
  console.log(chalk.blue(`      • Closing tags: ${tokens.filter(t => t.type === 'TAG_CLOSE').length}`));
  console.log(chalk.blue(`      • Text nodes: ${tokens.filter(t => t.type === 'TEXT').length}`));
  console.log(chalk.blue(`      • Fragments: ${tokens.filter(t => t.type === 'JSX_FRAGMENT').length}`));
  console.log(chalk.blue(`      • Comments: ${tokens.filter(t => t.type === 'COMMENT').length}`));
  return tokens;
}

function parse(tokens: Token[]): Node {
  console.log(chalk.cyan(`   ⚙️  Starting parsing...`));
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
        // Create a comment node with HTML comment format
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

        // Handle 'as' prop for text elements
        if (node.type === 'text' && node.attributes.as && allowedTextElements.includes(node.attributes.as)) {
          node.type = node.attributes.as;
          delete node.attributes.as;
        }

        // Map custom elements to HTML elements
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

  console.log(chalk.green(`   ✓ Parsing complete`));
  return root;
}

function generateHTML(node: Node, css: string, indent = 0): string {
  console.log(chalk.cyan(`   ⚙️  Starting HTML generation...`));
  let html = '';
  const spaces = '  '.repeat(indent);

  if (node.type === 'text') {
    return `${spaces}${node.text}\n`;
  }

  if (node.type === 'comment') {
    // Convert JSX comment to HTML comment format
    return `${spaces}<!-- ${node.text} -->\n`;
  }

  if (node.type === 'fragment') {
    return node.children.map(child => generateHTML(child, css, indent)).join('');
  }

  const attributes = Object.entries(node.attributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');

  html += `${spaces}<${node.type}${attributes}>\n`;

  for (const child of node.children) {
    html += generateHTML(child, css, indent + 1);
  }

  html += `${spaces}</${node.type}>\n`;
  return html;
}

export async function compileTigerToHTML(source: string): Promise<string> {
  console.log(chalk.cyan(`   ⚙️  Starting compilation...`));
  
  // Load stylesheet
  const css = await loadStylesheet();
  
  // Extract JSX content from the source
  const jsxMatch = source.match(/return\s*\(\s*([\s\S]*?)\s*\);/);
  if (!jsxMatch) {
    console.log(chalk.red(`   ❌ No JSX content found in source`));
    return '';
  }

  console.log(chalk.green(`   ✓ Extracted JSX content`));
  const jsxContent = jsxMatch[1];
  const tokens = tokenize(jsxContent);
  const ast = parse(tokens);
  const html = generateHTML(ast, css);
  
  console.log(chalk.green(`   ✓ Compilation complete`));
  return html;
} 