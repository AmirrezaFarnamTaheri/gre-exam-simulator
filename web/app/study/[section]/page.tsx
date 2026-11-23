import { notFound } from "next/navigation";
import { BANK } from "@/lib/questionBank";
import type { Section } from "gre-adaptive-engine";
import StudySession from "@/components/StudySession";

export default function StudyPage({ params, searchParams }: {
  params: { section: string };
  searchParams: { topic?: string | string[]; level?: string };
}) {
  if (params.section === "mistakes") {
    return <StudySession section={undefined} mistakesOnly />;
  }
  const section: Section | undefined =
    params.section === "verbal" || params.section === "quant" ? params.section : undefined;

  if (!section && params.section !== "mixed") notFound();
  const beginner = section === "quant" && searchParams.level === "beginner";
  const requested = searchParams.topic;
  const topic = typeof requested === "string" && BANK.some((question) =>
    question.topic === requested && (!section || question.section === section) && (!beginner || question.difficulty === 1)) ? requested : "";
  return <StudySession key={`${params.section}:${beginner}:${topic}`} section={section} initialTopic={topic} beginner={beginner} />;
}
