"use client";

import { useId, useState } from "react";

type Question = { question: string; answer: string };

export default function FoundingFaq({ questions }: { questions: Question[] }) {
  const [open, setOpen] = useState<number[]>([]);
  const id = useId();

  return (
    <div className="af-founding-faq-items">
      {questions.map(({ question, answer }, index) => {
        const expanded = open.includes(index);
        const panelId = `${id}-answer-${index}`;
        return (
          <div className={`af-founding-faq-item${expanded ? " is-open" : ""}`} key={question}>
            <button
              type="button"
              className="af-founding-faq-trigger"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen((current) => expanded ? current.filter((item) => item !== index) : [...current, index])}
            >
              {question}<span className="af-founding-faq-icon" aria-hidden="true">+</span>
            </button>
            <div className="af-founding-faq-answer" id={panelId} inert={!expanded}>
              <div className="af-founding-faq-answer-inner"><p>{answer}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
