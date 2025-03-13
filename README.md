# 🐯 Tiger Framework

Tiger is a modern, lightweight web framework built on top of Bun that enables you to create beautiful, performant web applications with a simple and intuitive syntax.

## ✨ Features

- **⚡ Lightning Fast**: Built on Bun for maximum performance and minimal overhead
- **🎨 Beautiful Design**: Intuitive component system with built-in responsive design
- **🛠️ Developer Friendly**: TypeScript support and great developer experience
- **📱 Responsive by Default**: Automatic responsive design system for all components
- **🔄 Multi-Page Support**: Built-in routing and multi-page application support
- **🎯 Simple Syntax**: JSX-like syntax that's easy to learn and use

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tiger-framework.git
cd tiger-framework

# Install dependencies
bun install
```

### Development

```bash
# Start the development server
bun run dev

# Build for production
bun run build

# Serve production build
bun run serve
```

## 📖 Usage

### Creating a Component

Components in Tiger use a simple, JSX-like syntax:

```typescript
const MyComponent = () => {
  return (
    <>
      <view className="container">
        <text as="h1">Hello Tiger!</text>
        <text>Welcome to my component</text>
      </view>
    </>
  );
};

export default MyComponent;
```

### Built-in Elements

Tiger provides several built-in elements:

- `<view>`: Container element (renders as div)
- `<text>`: Text element with optional `as` prop for semantic HTML
- `<link>`: Navigation element
- `<button>`: Interactive button element

### Styling

Tiger uses class-based styling with automatic responsive design:

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
```

### Routing

Create pages in the `src/pages` directory:

```
src/
  pages/
    page.tiger    # Home page (/)
    about/
      page.tiger  # About page (/about)
```

## 🏗️ Project Structure

```
tiger-framework/
├── src/
│   ├── build/          # Build system
│   ├── dev/           # Development server
│   ├── pages/         # Application pages
│   ├── template.html  # HTML template
│   └── App.css       # Global styles
├── dist/             # Production build
├── package.json
└── README.md
```

## 🛠️ Development Commands

- `bun run dev`: Start development server
- `bun run build`: Build for production
- `bun run serve`: Serve production build
- `bun run clean`: Clean build directory

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh)
- Inspired by React and modern web frameworks

