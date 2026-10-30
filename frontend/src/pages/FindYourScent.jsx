import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../lib/api";
import { ProductGrid } from "../components/ProductCard";

const steps = [
  { key: "scent", title: "What kind of scent do you love?" },
  { key: "occasion", title: "When will you wear it?" },
  { key: "projection", title: "How strong should it project?" },
  { key: "budget", title: "What's your budget?" },
  { key: "gender", title: "Who's it for?" },
];

const FindYourScent = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setOptions([]);
    const complete = steps.every(({ key }) => answers[key] !== undefined);
    http.post(complete ? "/quiz/recommend" : "/quiz/options", answers, { signal: controller.signal })
      .then(({ data }) => complete ? setResults(data.items) : setOptions(data.options))
      .catch((e) => { if (e.code !== "ERR_CANCELED") setError("We couldn't load your matches. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [answers, retry]);

  const pick = (value) => {
    if (loading) return;
    setLoading(true);
    setAnswers({ ...answers, [steps[step].key]: value });
    if (step < steps.length - 1) setStep(step + 1);
  };
  const back = () => {
    const previous = step - 1;
    setAnswers(Object.fromEntries(steps.slice(0, previous).map(({ key }) => [key, answers[key]])));
    setStep(previous);
  };
  const reset = () => { setStep(0); setAnswers({}); setResults(null); };

  if (results) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12" data-testid="quiz-results">
        <div className="text-center">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Your Results</div>
          <h1 className="font-display text-4xl sm:text-5xl mt-2">Your perfect matches</h1>
          <p className="text-sm text-jlt-black/60 mt-3">Based on your taste, here are the fragrances we think you'll love.</p>
          <button onClick={reset} className="btn-outline mt-4" data-testid="retake-quiz">Retake Quiz</button>
        </div>
        <div className="mt-10">
          {results.length === 0 ? (
            <div className="text-center text-jlt-black/60">Inventory has changed or no fragrances are available. Please retake the quiz or <Link className="text-jlt-gold" to="/shop">browse all</Link>.</div>
          ) : <ProductGrid items={results} />}
        </div>
      </div>
    );
  }

  const cur = steps[step];
  return (
    <div className="max-w-3xl mx-auto px-6 py-16" data-testid="quiz-page">
      <div className="text-center mb-10">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Find Your Scent — Step {step + 1} of {steps.length}</div>
        <h1 className="font-display text-3xl sm:text-4xl mt-3">{cur.title}</h1>
        <div className="w-full bg-jlt-black/10 h-1 mt-6 max-w-md mx-auto">
          <div className="bg-jlt-gold h-1 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
      {loading && <p role="status" className="text-center py-6">Finding available matches…</p>}
      {error && <div role="alert" className="text-center">{error} <button className="btn-outline" onClick={() => setRetry(retry + 1)}>Retry</button></div>}
      {!loading && !error && options.length === 0 && <p className="text-center">No fragrances are currently available for these answers. <button className="underline" onClick={reset}>Start again</button></p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.map((o, i) => {
          const label = o.label;
          return (
            <button key={i} disabled={loading} onClick={() => pick(o.value)} data-testid={`quiz-option-${label}`}
              className="bg-white border border-jlt-black/15 hover:border-jlt-gold p-5 text-center transition">
              <div className="font-display text-lg">{label}</div><div className="text-xs mt-2 text-jlt-black/60">{o.count} matches</div>
            </button>
          );
        })}
      </div>
      {step > 0 && <button onClick={back} className="mt-8 text-xs tracking-[0.2em] uppercase text-jlt-black/60" data-testid="quiz-back">← Back</button>}
    </div>
  );
};
export default FindYourScent;
