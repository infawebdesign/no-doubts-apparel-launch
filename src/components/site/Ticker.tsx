const WORDS = [
  "Earn Your Stripes",
  "Hit The Standard",
  "Leave No Doubts",
  "MMXXVI",
];

const colors = ["text-lime", "text-cobalt", "text-magenta", "text-tiger"];

export function Ticker() {
  const row = [...WORDS, ...WORDS, ...WORDS];
  return (
    <div className="overflow-hidden border-y border-border py-3">
      <div className="animate-ticker flex w-max">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {row.map((word, i) => (
              <span
                key={`${dup}-${i}`}
                className={`display px-6 text-2xl sm:text-4xl ${colors[i % colors.length]}`}
              >
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
