import type { VibeCheckData } from "@vibecheck/shared";

const baseElements: VibeCheckData["elements"] = [
  {
    id: "login_heading",
    type: "heading",
    text: "Welcome back",
    position: { x: 48, y: 42, width: 304, height: 38 },
    style: { color: "#0F172A", font_size: 30, font_weight: "700" },
    visibility: "visible",
  },
  {
    id: "email_input",
    type: "input",
    text: "Email address",
    position: { x: 48, y: 112, width: 304, height: 48 },
    style: { color: "#64748B", background_color: "#FFFFFF", border_radius: 8, font_size: 14, padding: "12px" },
    required: true,
    visibility: "visible",
  },
  {
    id: "password_input",
    type: "input",
    text: "Password",
    position: { x: 48, y: 176, width: 304, height: 48 },
    style: { color: "#64748B", background_color: "#FFFFFF", border_radius: 8, font_size: 14, padding: "12px" },
    required: true,
    visibility: "visible",
  },
  {
    id: "submit_button",
    type: "button",
    text: "Sign in",
    position: { x: 48, y: 248, width: 304, height: 48 },
    style: { color: "#FFFFFF", background_color: "#2563EB", border_radius: 8, font_size: 15, font_weight: "600", padding: "12px" },
    required: true,
    visibility: "visible",
  },
];

const layout = {
  container_alignment: "centered" as const,
  total_elements_expected: 4,
  viewport_width: 400,
  viewport_height: 400,
};

export function createMockVibeCheckData(): { expected: VibeCheckData; actual: VibeCheckData } {
  const expected: VibeCheckData = {
    elements: structuredClone(baseElements),
    layout,
    metadata: { source: "generated" },
  };
  const actual: VibeCheckData = {
    elements: structuredClone(baseElements),
    layout,
    metadata: { source: "extracted" },
  };

  const button = actual.elements.find((element) => element.id === "submit_button");
  if (button?.style) button.style.background_color = "#DC2626";

  return { expected, actual };
}
