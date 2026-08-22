import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * The web document shell.
 *
 * Exists for the surfaces React Native Web cannot reach: text selection, the
 * caret, the scrollbar, and the figures inside tabular data. Those ship with
 * browser defaults that belong to no design system, and leaving them is the
 * cheapest way for a considered interface to look assembled.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#FFFFFF" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: documentStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const documentStyles = `
  html, body { background-color: #FFFFFF; }

  /* Claret at low strength, so a selection reads as this product's selection. */
  ::selection { background-color: #E6E6E6; color: #1A1A1A; }

  /* The caret is a brand surface in every text input on the page. */
  input, textarea { caret-color: #1A1A1A; }

  /*
   * Tabular figures everywhere a number is compared down a column. Plex Mono is
   * already fixed-pitch, but the sans carries counts in badges and buttons too,
   * and proportional digits make those jump as they change.
   */
  * { font-variant-numeric: tabular-nums; }

  /* Sit the scrollbar in the palette rather than in the platform's grey. */
  * { scrollbar-width: thin; scrollbar-color: #D2D2D2 transparent; }
  ::-webkit-scrollbar { width: 11px; height: 11px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background-color: #D2D2D2;
    border-radius: 999px;
    border: 3px solid #FFFFFF;
  }
  ::-webkit-scrollbar-thumb:hover { background-color: #A8A8A8; }

  /* Underlines that clear the descenders instead of striking through them. */
  a { text-underline-offset: 0.18em; text-decoration-thickness: 0.06em; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
