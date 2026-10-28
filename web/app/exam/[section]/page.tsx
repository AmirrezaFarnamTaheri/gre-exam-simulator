import type { Section } from "gre-adaptive-engine";
import ExamSession from "@/components/exam/ExamSession";

export default function ExamPage({ params }: { params: { section: string } }) {
  const isQuant = params.section === "quant";
  const section: Section = isQuant ? "quant" : "verbal";

  // Section 1 in the shortened GRE is 12 questions:
  // Quant: 21 minutes | Verbal: 18 minutes
  const questionCount = 12;
  const durationMinutes = isQuant ? 21 : 18;

  return (
    <ExamSession
      section={section}
      questionCount={questionCount}
      durationMinutes={durationMinutes}
    />
  );
}
