"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    trackEvent("page_error", {
      scenario: "global_render_error",
      input_length: 0,
      error_message: error.message.slice(0, 180),
      current_step: "page",
    });
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f7f9" }}>
          <section style={{ width: "100%", maxWidth: 560, border: "1px solid #d8dde6", background: "#fff", borderRadius: 6, padding: 24 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>页面出现异常</h1>
            <p style={{ marginTop: 12, color: "#596272", fontSize: 14, lineHeight: 1.7 }}>
              你的输入内容已尽量保留，可以刷新或返回重新操作
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{ marginTop: 20, minHeight: 36, border: 0, borderRadius: 4, background: "#2563eb", color: "#fff", padding: "8px 12px", fontSize: 14, fontWeight: 600 }}
            >
              返回首页
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
