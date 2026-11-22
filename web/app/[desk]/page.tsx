import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { ALL_QUESTIONS, BANK } from "@/lib/questionBank";
import { topicsForSection } from "gre-adaptive-engine";

const desks = ["practice", "tests", "learn", "progress"] as const;

export function generateStaticParams() {
  return desks.map((desk) => ({ desk }));
}

export default function DeskPage({ params }: { params: { desk: string } }) {
  const desk = desks.find((entry) => entry === params.desk);
  if (!desk) notFound();
  if (desk === "progress") {
    return <Dashboard desk={desk} catalog={{
      questionIds: ALL_QUESTIONS.map(({ id }) => id),
      topics: { verbal: topicsForSection(BANK, "verbal"), quant: topicsForSection(BANK, "quant") },
    }} />;
  }
  return <Dashboard desk={desk} />;
}

