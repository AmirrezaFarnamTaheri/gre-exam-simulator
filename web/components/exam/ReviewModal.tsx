"use client";

import React, { useEffect } from "react";
import type { AnyQuestion } from "gre-adaptive-engine";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: AnyQuestion[];
  userAnswers: Record<string, any>;
  markedQuestions: Record<string, boolean>;
  onSelectQuestion: (index: number) => void;
  currentIndex: number;
}

export default function ReviewModal({
  isOpen,
  onClose,
  questions,
  userAnswers,
  markedQuestions,
  onSelectQuestion,
  currentIndex,
}: ReviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function isAnswered(q: AnyQuestion) {
    const ans = userAnswers[q.id];
    if (ans === undefined || ans === null || ans === "") return false;
    if (q.qtype === "text_completion") {
      if (typeof ans !== "object") return false;
      const reqBlanks = Object.keys(q.choices);
      return reqBlanks.every((b) => !!ans[b]);
    }
    if (q.qtype === "sentence_equivalence") {
      return Array.isArray(ans) && ans.length === 2;
    }
    if (Array.isArray(ans)) return ans.length > 0;
    return true;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white text-gray-900 rounded-lg shadow-2xl border-2 border-gray-400 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-[#1b3a5b] text-white px-5 py-3 flex justify-between items-center">
          <h2 id="review-modal-title" className="text-lg font-bold tracking-wide">REVIEW QUESTIONS</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded font-bold text-sm"
          >
            Return to Test
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b text-xs text-gray-700">
          Below is the status of each question in this section. Click any row to jump directly to that question.
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-left text-sm border border-gray-300">
            <thead className="bg-[#e2e8f0] text-gray-800 font-bold uppercase text-xs">
              <tr>
                <th className="py-2.5 px-4 border-b text-gray-800">Question Number</th>
                <th className="py-2.5 px-4 border-b text-gray-800">Status</th>
                <th className="py-2.5 px-4 border-b text-center text-gray-800">Marked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questions.map((q, idx) => {
                const answered = isAnswered(q);
                const marked = !!markedQuestions[q.id];
                const isCurrent = idx === currentIndex;

                return (
                  <tr
                    key={q.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => {
                      onSelectQuestion(idx);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectQuestion(idx);
                        onClose();
                      }
                    }}
                    className={`cursor-pointer hover:bg-blue-50 transition ${
                      isCurrent ? "bg-blue-100/70 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4 flex items-center gap-2 text-gray-900">
                      <span>Question {idx + 1}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-[#1b3a5b] text-white px-1.5 py-0.5 rounded font-bold">
                          CURRENT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {answered ? (
                        <span className="text-green-700 font-medium">
                          Answered
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">
                          Not Answered
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-red-600">
                      {marked ? "Marked" : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-gray-100 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-[#1b3a5b] hover:bg-[#12273e] text-white rounded text-sm font-bold shadow"
          >
            Return to Test
          </button>
        </div>
      </div>
    </div>
  );
}
