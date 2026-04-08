declare module "react-dom" {
  import type { ReactNode } from "react";
  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment
  ): import("react").ReactPortal;
  export function flushSync<R>(fn: () => R): R;
  export const version: string;
}

declare module "react-dom/client" {
  import type { ReactNode } from "react";
  interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }
  export function createRoot(
    container: Element | DocumentFragment,
    options?: { onRecoverableError?: (error: unknown) => void }
  ): Root;
  export function hydrateRoot(
    container: Element | Document | DocumentFragment | Comment,
    initialChildren: ReactNode
  ): Root;
}
