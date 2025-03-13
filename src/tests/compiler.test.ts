import { expect, test, describe } from "bun:test";
import { compileTigerToHTML } from "../build/compiler";

describe("Tiger Compiler", () => {
  test("should compile basic Tiger component", async () => {
    const input = `
      const TestComponent = () => {
        return (
          <view className="test">
            <text>Hello World</text>
          </view>
        );
      };
    `;

    const output = await compileTigerToHTML(input);
    expect(output).toContain('<div class="test">');
    expect(output).toContain('Hello World');
  });

  test("should handle JSX comments", async () => {
    const input = `
      const TestComponent = () => {
        return (
          <view>
            {/* This is a comment */}
            <text>Content</text>
          </view>
        );
      };
    `;

    const output = await compileTigerToHTML(input);
    expect(output).toContain('<!-- This is a comment -->');
    expect(output).toContain('Content');
  });

  test("should process text elements with 'as' prop", async () => {
    const input = `
      const TestComponent = () => {
        return (
          <view>
            <text as="h1">Heading</text>
            <text as="p">Paragraph</text>
          </view>
        );
      };
    `;

    const output = await compileTigerToHTML(input);
    expect(output).toContain('<h1>Heading</h1>');
    expect(output).toContain('<p>Paragraph</p>');
  });

  test("should handle nested components", async () => {
    const input = `
      const TestComponent = () => {
        return (
          <view className="parent">
            <view className="child">
              <text>Nested Content</text>
            </view>
          </view>
        );
      };
    `;

    const output = await compileTigerToHTML(input);
    expect(output).toContain('<div class="parent">');
    expect(output).toContain('<div class="child">');
    expect(output).toContain('Nested Content');
  });

  test("should process link elements", async () => {
    const input = `
      const TestComponent = () => {
        return (
          <view>
            <link to="/home">Home</link>
          </view>
        );
      };
    `;

    const output = await compileTigerToHTML(input);
    expect(output).toContain('<a href="/home">');
    expect(output).toContain('Home</a>');
  });

  test("should handle button with bind attribute", async () => {
    const input = `
      const TestComponent = () => {
        return (
          <view>
            <button bind="handleClick">Click Me</button>
          </view>
        );
      };
    `;

    const output = await compileTigerToHTML(input);
    expect(output).toContain('<button onclick="(handleClick)()">');
    expect(output).toContain('Click Me</button>');
  });
}); 