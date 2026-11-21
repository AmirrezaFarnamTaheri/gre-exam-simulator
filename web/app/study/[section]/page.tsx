import type { Section } from "gre-adaptive-engine";
import StudySession from "@/components/StudySession";

export default function StudyPage({ params }: { params: { section: string } }) {
  if (params.section === "mistakes") {
    return <StudySession section={undefined} mistakesOnly />;
  }
  const section: Section | undefined =
    params.section === "verbal" || params.section === "quant" ? params.section : undefined;

  return <StudySession section={section} />;
}
