import chalk from 'chalk';

// Types for responsive system
type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
type BreakpointValues = Record<Breakpoint, string>;
type StyleObject = {
  base: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
};
type PatternStyles = Record<string, StyleObject>;

// Responsive breakpoints
const breakpoints: BreakpointValues = {
  sm: '320px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
};

// Common responsive patterns
const responsivePatterns: PatternStyles = {
  container: {
    base: `
      width: 100%;
      margin-left: auto;
      margin-right: auto;
      padding-left: 1rem;
      padding-right: 1rem;
    `,
    sm: `max-width: 100%;`,
    md: `max-width: 720px;`,
    lg: `max-width: 960px;`,
    xl: `max-width: 1200px;`
  },
  
  header: {
    base: `
      position: relative;
      padding: 1rem;
    `,
    sm: `
      .header-content {
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      .header-nav {
        flex-direction: column;
        align-items: center;
        width: 100%;
        gap: 1rem;
      }
      .nav-link {
        display: block;
        width: 100%;
        text-align: center;
        padding: 0.5rem;
      }
    `,
    md: `
      .header-content {
        flex-direction: row;
        justify-content: space-between;
      }
      .header-nav {
        flex-direction: row;
        width: auto;
      }
    `
  },

  hero: {
    base: `
      text-align: center;
      padding: 2rem 1rem;
    `,
    sm: `
      .hero-title {
        font-size: 2rem;
        line-height: 1.2;
      }
      .hero-subtitle {
        font-size: 1.25rem;
      }
      .hero-description {
        font-size: 1rem;
        padding: 0 1rem;
      }
      .hero-buttons {
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        padding: 0 2rem;
      }
      .primary-button,
      .secondary-button {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }
    `,
    md: `
      padding: 4rem 2rem;
      .hero-title {
        font-size: 3rem;
      }
      .hero-subtitle {
        font-size: 1.5rem;
      }
      .hero-buttons {
        flex-direction: row;
        justify-content: center;
        width: auto;
        padding: 0;
      }
      .primary-button,
      .secondary-button {
        width: auto;
        max-width: none;
        margin: 0;
      }
    `
  },

  features: {
    base: `
      padding: 2rem 1rem;
    `,
    sm: `
      .features-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
      .feature-card {
        padding: 1.5rem;
      }
      .feature-title {
        font-size: 1.25rem;
      }
      .feature-description {
        font-size: 1rem;
      }
    `,
    md: `
      padding: 4rem 2rem;
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    `,
    lg: `
      .features-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    `
  },

  cta: {
    base: `
      padding: 2rem 1rem;
      text-align: center;
    `,
    sm: `
      .cta-title {
        font-size: 1.5rem;
      }
      .cta-description {
        font-size: 1rem;
        padding: 0 1rem;
      }
      .cta-button {
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
      }
    `,
    md: `
      padding: 4rem 2rem;
      .cta-title {
        font-size: 2rem;
      }
      .cta-button {
        width: auto;
        max-width: none;
        margin: 0;
      }
    `
  },

  footer: {
    base: `
      padding: 2rem 1rem;
    `,
    sm: `
      .footer-content {
        flex-direction: column;
        gap: 2rem;
        text-align: center;
      }
      .footer-links {
        flex-direction: column;
        gap: 1rem;
      }
      .footer-copyright {
        margin-top: 2rem;
        text-align: center;
      }
    `,
    md: `
      .footer-content {
        flex-direction: row;
        text-align: left;
      }
      .footer-links {
        flex-direction: row;
      }
    `
  }
};

// Generate media queries
function generateMediaQuery(breakpoint: Breakpoint, styles: string): string {
  return `
@media (min-width: ${breakpoints[breakpoint]}) {
  ${styles}
}
`;
}

// Generate responsive styles
export function generateResponsiveCSS(html: string): string {
  let css = '';

  // Add base responsive utilities
  css += `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

button {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}
`;

  // Apply responsive patterns
  Object.entries(responsivePatterns).forEach(([pattern, styles]) => {
    // Add base styles
    if (styles.base) {
      css += `
.${pattern}-container {
  ${styles.base}
}`;
    }

    // Add responsive styles for each breakpoint
    (Object.keys(breakpoints) as Breakpoint[]).forEach(breakpoint => {
      const breakpointStyles = styles[breakpoint];
      if (breakpointStyles) {
        css += generateMediaQuery(breakpoint, `
  .${pattern}-container {
    ${breakpointStyles}
  }
`);
      }
    });
  });

  return css;
} 