// Core framework implementation
export type VNode = {
  type: string | Function;
  props: Record<string, any>;
  children: VNode[];
};

export type Component = (props: any) => VNode;

export function createElement(
  type: string | Function,
  props: Record<string, any> = {},
  ...children: VNode[]
): VNode {
  return {
    type,
    props,
    children: children.flat(),
  };
}

export function renderToString(vnode: VNode): string {
  if (typeof vnode.type === 'function') {
    const component = vnode.type as Component;
    const result = component(vnode.props);
    return renderToString(result);
  }

  if (vnode.type === 'Fragment') {
    return vnode.children.map(child => renderToString(child)).join('');
  }

  const element = document.createElement(vnode.type as string);
  
  // Handle props
  Object.entries(vnode.props).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key.startsWith('on')) {
      const eventName = key.toLowerCase().slice(2);
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Handle children
  vnode.children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      render(child, element);
    }
  });

  return element.outerHTML;
}

export function render(vnode: VNode, container: HTMLElement) {
  if (typeof vnode.type === 'function') {
    const component = vnode.type as Component;
    const result = component(vnode.props);
    render(result, container);
    return;
  }

  const element = document.createElement(vnode.type as string);
  
  // Handle props
  Object.entries(vnode.props).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key.startsWith('on')) {
      const eventName = key.toLowerCase().slice(2);
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Handle children
  vnode.children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      render(child, element);
    }
  });

  container.appendChild(element);
}

// Fragment support
export const Fragment = {
  type: 'Fragment',
  props: {},
  children: [],
}; 