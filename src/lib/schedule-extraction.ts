import Anthropic from "@anthropic-ai/sdk";

export type ExtractedTagResult = {
  tag: string;
  description?: string;
  pageNumber?: number;
};

const EXTRACTION_TOOL_NAME = "record_equipment_tags";

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: EXTRACTION_TOOL_NAME,
  description:
    "Records the equipment/product tags found on a construction drawing schedule sheet.",
  input_schema: {
    type: "object",
    properties: {
      tags: {
        type: "array",
        description: "One entry per distinct equipment/product tag found in the schedule.",
        items: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description: "The equipment/product tag exactly as printed, e.g. \"AHU-1\" or \"P-3\".",
            },
            description: {
              type: "string",
              description:
                "Short description sitting directly next to the tag on the same schedule row, if present (e.g. \"Air Handling Unit\"). Omit if the sheet doesn't show one.",
            },
            pageNumber: {
              type: "integer",
              description: "1-indexed page number the tag was found on.",
            },
          },
          required: ["tag"],
        },
      },
    },
    required: ["tags"],
  },
};

const SYSTEM_PROMPT =
  "You are reading a construction drawing equipment/product schedule PDF. Identify every distinct equipment or product tag shown in the schedule tables (e.g. AHU-1, P-3, EF-2, LP-1). Only record what is actually printed on the page — do not invent tags, quantities, or specs. Call the record_equipment_tags tool exactly once with every tag you find.";

export async function extractEquipmentTags(pdfBytes: Buffer): Promise<ExtractedTagResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: "Extract every equipment/product tag from this schedule.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME
  );
  if (!toolUse) {
    throw new Error("The model did not return any extracted tags.");
  }

  const input = toolUse.input as { tags?: unknown };
  if (!Array.isArray(input.tags)) {
    throw new Error("Malformed extraction response.");
  }

  return input.tags
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      tag: String(t.tag ?? "").trim(),
      description: typeof t.description === "string" && t.description.trim() ? t.description.trim() : undefined,
      pageNumber: typeof t.pageNumber === "number" ? t.pageNumber : undefined,
    }))
    .filter((t) => t.tag.length > 0);
}
