export interface FaqItem {
  key: string;
  question: string;
  answer: string;
}

/**
 * Vraag-en-antwoordlijst.
 *
 * `<details>` in plaats van een eigen accordeon: het opent zonder JavaScript,
 * is met het toetsenbord te bedienen en de zoekfunctie van de browser vindt
 * tekst ook in een dichtgeklapt paneel — bij een accordeon op state is dat
 * laatste niet zo.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <details key={item.key} className="py-4">
          <summary className="flex cursor-pointer items-start gap-3 font-semibold">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="faq-chevron mt-0.5 size-5 shrink-0 text-caro-orange transition-[rotate]"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span>{item.question}</span>
          </summary>
          <p className="mt-3 ps-8 text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
