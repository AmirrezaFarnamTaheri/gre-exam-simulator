import type { Section } from "gre-adaptive-engine";
import StudySession from "@/components/StudySession";

export default function StudyPage({ params }: { params: { section: string } }) {
  // Anything other than exactly "verbal" or "quant" (including "mixed") falls back
  // to mixed practice across both sections.
  const section: Section | undefined =
    params.section === "verbal" || params.section === "quant" ? params.section : undefined;

  return <StudySession section={section} />;
}
