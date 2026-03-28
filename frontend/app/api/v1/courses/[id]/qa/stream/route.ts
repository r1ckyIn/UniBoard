import { courses } from "@/lib/fixtures/courses";

const MOCK_DELAY = 50; // ms between tokens

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const course = courses.find((c) => c.id === id);

  if (!course) {
    return new Response("Course not found", { status: 404 });
  }

  const body = (await request.json()) as { question: string; language?: string };
  const lang = body.language ?? "en";

  const answer =
    lang === "zh"
      ? `根据 ${course.code} ${course.name} 的课程资料，这是一个关于你提问的模拟回答。实际部署后会由 Claude AI 基于课程内容实时生成回答。`
      : `Based on ${course.code} ${course.name} course materials, here is a mock answer to your question. In production, Claude AI will generate real-time answers based on synced course content.`;

  const tokens = answer.split(" ");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        new TextEncoder().encode(sseEvent("status", { phase: "searching" })),
      );

      await new Promise((r) => setTimeout(r, 500));

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
