import { computeVibeCheckDiff } from "@vibecheck/person-b";
import { createMockVibeCheckData } from "@/lib/mockData";

export async function POST(request: Request) {
  let submission: { prompt?: unknown; code?: unknown } = {};

  try {
    submission = await request.json();
  } catch {
    return Response.json({ error: "Please submit a valid JSON request." }, { status: 400 });
  }

  const { expected, actual } = createMockVibeCheckData();
  const diff = computeVibeCheckDiff(expected, actual);

  return Response.json({
    expected,
    actual,
    diff,
    prompt: typeof submission.prompt === "string" ? submission.prompt : "",
    code: typeof submission.code === "string" ? submission.code : "",
  });
}
