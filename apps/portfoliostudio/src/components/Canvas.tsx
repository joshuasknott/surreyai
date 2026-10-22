import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PortfolioRenderer,
  type PortfolioRendererProps,
} from "../portfolio/PortfolioRenderer";
import portfolioCss from "../portfolio/portfolio.css?raw";
export function Canvas({
  width,
  ...props
}: PortfolioRendererProps & { width: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(1, (size.width - 40) / width);
  const height = Math.max(400, (size.height - 32) / scale);
  return (
    <div ref={outer} className="canvas-viewport">
      <div
        className="canvas-sheet"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          ref={frame}
          title={
            props.editable ? "Editable portfolio canvas" : "Portfolio preview"
          }
          onLoad={() => setBody(frame.current?.contentDocument?.body || null)}
          srcDoc={
            '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/portfolio-fonts.css"></head><body style="margin:0"></body></html>'
          }
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        {body &&
          createPortal(
            <>
              <style>{portfolioCss}</style>
              <PortfolioRenderer {...props} />
            </>,
            body,
          )}
      </div>
      <span className="canvas-width">
        {width}px · {Math.round(scale * 100)}%
      </span>
    </div>
  );
}
