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

// Optimized attribute processing with a single pass
function processAttributes(attributes: Record<string, string>): Record<string, string> {
  const processed: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(attributes)) {
    switch (key) {
      case 'className':
        processed.class = value;
        break;
      case 'bind':
        processed.onclick = `(${value})()`;
        break;
      case 'to':
        processed.href = value;
        break;
      default:
        processed[key] = value;
    }
  }
  
  return processed;
}

async function loadStylesheet(): Promise<string> {
  try {
    const css = await readFile('./src/stylesheet.css', 'utf-8');
    return css;
  } catch (error) {
    console.error(chalk.red(`Failed to load stylesheet: ${error}`));
    return '';
  }
}

// Optimized tokenizer with minimal logging and efficient string handling
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let current = 0;
  const length = source.length;
  
  while (current < length) {
    const char = source[current];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      current++;
      continue;
    }
    
    // Handle JSX comments
    if (source.slice(current, current + 4) === '{/*') {
      current += 4;
      const commentStart = current;
      
      while (current < length && source.slice(current, current + 3) !== '*/}') {
        current++;
      }
      
      tokens.push({ 
        type: 'COMMENT', 
        value: source.slice(commentStart, current).trim() 
      });
      current += 3;
      continue;
    }
    
    // Handle JSX fragments
    if (source.slice(current, current + 2) === '<>') {
      tokens.push({ type: 'JSX_FRAGMENT', value: '<>' });
      current += 2;
      continue;
    }
    
    if (source.slice(current, current + 3) === '</>') {
      tokens.push({ type: 'JSX_FRAGMENT', value: '</>' });
      current += 3;
      continue;
    }
    
    // Handle opening tags
    if (char === '<' && source[current + 1] !== '/') {
      current++;
      const tagStart = current;
      
      while (current < length && !/\s/.test(source[current]) && source[current] !== '>') {
        current++;
      }
      
      const tagName = source.slice(tagStart, current);
      const attributes: Record<string, string> = {};
      
      // Get attributes
      while (current < length && source[current] !== '>') {
        if (source[current] === ' ') {
          current++;
          continue;
        }
        
        const attrStart = current;
        while (current < length && source[current] !== '=' && !/\s/.test(source[current])) {
          current++;
        }
        
        const attrName = source.slice(attrStart, current);
        
        if (source[current] === '=') {
          current += 2; // Skip = and opening quote
          const valueStart = current;
          
          while (current < length && source[current] !== '"' && source[current] !== "'") {
            current++;
          }
          
          attributes[attrName] = source.slice(valueStart, current);
          current++; // Skip closing quote
        }
      }
      
      current++; // Skip >
      tokens.push({ type: 'TAG_OPEN', value: tagName, attributes });
      continue;
    }
    
    // Handle closing tags
    if (char === '<' && source[current + 1] === '/') {
      current += 2;
      const tagStart = current;
      
      while (current < length && source[current] !== '>') {
        current++;
      }
      
      tokens.push({ 
        type: 'TAG_CLOSE', 
        value: source.slice(tagStart, current) 
      });
      current++;
      continue;
    }
    
    // Handle text content
    if (char !== '<' && char !== '>') {
      const textStart = current;
      
      while (current < length && source[current] !== '<') {
        current++;
      }
      
      const text = source.slice(textStart, current).trim();
      if (text) {
        tokens.push({ type: 'TEXT', value: text });
      }
    }
  }
  
  return tokens;
}

// Optimized parser with minimal recursion
function parse(tokens: Token[]): Node {
  let current = 0;
  
  function createNode(type: string, attributes: Record<string, string> = {}): Node {
    return { type, attributes, children: [] };
  }
  
  function parseNode(): Node {
    const token = tokens[current];
    
    if (token.type === 'JSX_FRAGMENT') {
      const node = createNode('fragment');
      current++;
      
      while (current < tokens.length && tokens[current].value !== '</>') {
        node.children.push(parseNode());
      }
      
      current++; // Skip closing fragment
      return node;
    }
    
    if (token.type === 'COMMENT') {
      const node = createNode('comment');
      node.text = token.value;
      current++;
      return node;
    }
    
    if (token.type === 'TEXT') {
      const node = createNode('text');
      node.text = token.value;
      current++;
      return node;
    }
    
    if (token.type === 'TAG_OPEN') {
      const { value: type, attributes = {} } = token;
      const node = createNode(type, processAttributes(attributes));
      current++;
      
      // Handle self-closing tags
      if (type === 'img' || type === 'input' || type === 'br' || type === 'hr') {
        return node;
      }
      
      // Parse children until we find the matching closing tag
      while (
        current < tokens.length && 
        !(tokens[current].type === 'TAG_CLOSE' && tokens[current].value === type)
      ) {
        node.children.push(parseNode());
      }
      
      current++; // Skip closing tag
      return node;
    }
    
    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
  
  const rootNode = createNode('root');
  while (current < tokens.length) {
    rootNode.children.push(parseNode());
  }
  
  return rootNode;
}

// Optimized HTML generation with string building
function generateHTML(node: Node, indent = 0): string {
  const indentStr = '  '.repeat(indent);
  
  switch (node.type) {
    case 'root':
      return node.children.map(child => generateHTML(child, indent)).join('\n');
      
    case 'fragment':
      return node.children.map(child => generateHTML(child, indent)).join('\n');
      
    case 'comment':
      return `${indentStr}<!-- ${node.text} -->`;
      
    case 'text':
      return `${indentStr}${node.text}`;
      
    default: {
      const tagName = elementMap[node.type] || node.type;
      const attrs = Object.entries(node.attributes)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join('');
      
      // Self-closing tags
      if (tagName === 'img' || tagName === 'input' || tagName === 'br' || tagName === 'hr') {
        return `${indentStr}<${tagName}${attrs} />`;
      }
      
      // Handle text elements with 'as' attribute
      if (node.type === 'text' && node.attributes.as && allowedTextElements.includes(node.attributes.as)) {
        const textTag = node.attributes.as;
        delete node.attributes.as;
        return `${indentStr}<${textTag}${attrs}>${
          node.children.map(child => generateHTML(child, 0)).join('')
        }</${textTag}>`;
      }
      
      // Regular elements with children
      if (node.children.length === 0) {
        return `${indentStr}<${tagName}${attrs}></${tagName}>`;
      }
      
      return [
        `${indentStr}<${tagName}${attrs}>`,
        ...node.children.map(child => generateHTML(child, indent + 1)),
        `${indentStr}</${tagName}>`
      ].join('\n');
    }
  }
}

export async function compileTigerToHTML(source: string): Promise<string> {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  return generateHTML(ast);
} 