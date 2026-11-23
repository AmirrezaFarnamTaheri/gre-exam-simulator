import type { Section } from "gre-adaptive-engine";
import ExamSession from "@/components/exam/ExamSession";

export default function ExamPage({ params }: { params: { section: string } }) {
  const isQuant = params.section === "quant" || params.section === "quant-s1";
  const section: Section = isQuant ? "quant" : "verbal";
  const singleStage = params.section.endsWith("-s1");

  // Official Shortened GRE (2023+):
  // Section 1: 12 Q (Quant 21 min | Verbal 18 min)
  // Section 2 (adaptive): 15 Q (Quant 26 min | Verbal 23 min)
  const questionCount = 12;
  const durationMinutes = isQuant ? 21 : 18;

  return (
    <ExamSession
      section={section}
      adaptiveTwoStage={!singleStage}
      questionCount={questionCount}
      durationMinutes={durationMinutes}
    />
  );
}
