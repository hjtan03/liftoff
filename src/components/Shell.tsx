import type { ReactNode } from "react";

type Props = { metaText: string; children: ReactNode };

/** The page frame every screen shares: the brand bar with its status line, then the content. */
export function Shell({ metaText, children }: Props) {
  return (
    <div className="wrap">
      <header className="bar">
        <div className="brand">
          Lift<span>off</span>
        </div>
        <div className="meta">{metaText}</div>
      </header>
      <main>{children}</main>
    </div>
  );
}
