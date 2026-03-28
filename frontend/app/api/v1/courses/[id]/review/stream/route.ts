import { courses } from "@/lib/fixtures/courses";

const MOCK_DELAY = 40; // ms between tokens

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return new Response("Course not found", { status: 404 });
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") ?? "en";

  const review =
    lang === "zh"
      ? `## 核心概念\n\n- ${course.name} 的基础理论\n- 关键公式与应用\n\n## 常见错误\n\n- 概念混淆\n- 计算步骤遗漏\n\n## 考试范围\n\n涵盖第1-6周内容\n\n## 学习建议\n\n- 多做练习题\n- 复习课堂笔记`
      : `## Key Concepts\n\n- Core theories of ${course.name}\n- Key formulas and applications\n\n## Common Mistakes\n\n- Concept confusion\n- Missing calculation steps\n\n## Exam Scope\n\nCovers Weeks 1-6 content\n\n## Study Tips\n\n- Practice problems regularly\n- Review lecture notes`;

  const tokens = review.split(" ");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        new TextEncoder().encode(sseEvent("status", { phase: "analyzing" })),
      );

      await new Promise((r) => setTimeout(r, 800));

      for (const token of tokens) {
        controller.enqueue(
          new TextEncoder().encode(sseEvent("token", { text: token + " " })),
        );
        await new Promise((r) => setTimeout(r, MOCK_DELAY));
      }

      controller.enqueue(
        new TextEncoder().encode(sseEvent("done", { status: "complete" })),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
