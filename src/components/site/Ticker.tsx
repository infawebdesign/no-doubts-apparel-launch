const WORDS = [
  "Earn Your Total",
  "Hit The Standard",
  "Varsity",
  "OG",
];

export function Ticker() {
  const row = [...WORDS, ...WORDS, ...WORDS];
  return (
    <div className="overflow-hidden border-y border-border bg-card py-3">
      <div className="animate-ticker flex w-max">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {row.map((word, i) => (
              <span
                key={`${dup}-${i}`}
                className="display flex items-center px-6 text-xl text-bone/70 sm:text-3xl"
              >
                {word}
                <span className="ml-6 inline-block size-1.5 bg-bone/30" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
