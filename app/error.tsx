"use client";

import { useEffect } from "react";
import { Button } from "@/components/common/Button";
import { trackEvent } from "@/lib/analytics";

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    trackEvent("page_error", {
      scenario: "route_render_error",
      input_length: 0,
      error_message: error.message.slice(0, 180),
      current_step: "page",
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-xl rounded border border-[var(--border)] bg-white p-6">
        <h1 className="text-2xl font-semibold">页面出现异常</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          你的输入内容已尽量保留，可以刷新或返回重新操作
        </p>
        <Button className="mt-5" onClick={() => window.location.assign("/")}>
          返回首页
        </Button>
      </section>
    </main>
  );
}
