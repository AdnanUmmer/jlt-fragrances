import React, { useState } from "react";
import { Link } from "react-router-dom";
import http from "../lib/api";
import { ProductGrid } from "../components/ProductCard";

const steps = [
  { key: "scent", title: "What kind of scent do you love?", options: ["Fresh","Sweet","Oud","Floral","Musky","Spicy","Clean"] },
  { key: "occasion", title: "When will you wear it?", options: ["Daily","Office","Date Night","Wedding","Gifting","Festive"] },
  { key: "projection", title: "How strong should it project?", options: ["Soft","Moderate","Strong"] },
  { key: "budget", title: "What's your budget?", options: [["Under ₹500", 500],["Under ₹800", 800],["Under ₹1300", 1300]] },
  { key: "gender", title: "Who's it for?", options: ["Men","Women","Unisex"] },
];

const FindYourScent = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  const submit = async (final) => {
    const r = await http.post("/quiz/recommend", final);
    setResults(r.data.items);
  };

  const pick = (val) => {
    const cur = steps[step];
    const v = Array.isArray(val) ? val[1] : val;
    const next = { ...answers, [cur.key]: v };
    setAnswers(next);
    if (step === steps.length - 1) submit(next);
    else setStep(step + 1);
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
            <div className="text-center text-jlt-black/60">No exact matches — <Link className="text-jlt-gold" to="/shop">browse all</Link>.</div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cur.options.map((o, i) => {
          const label = Array.isArray(o) ? o[0] : o;
          return (
            <button key={i} onClick={() => pick(o)} data-testid={`quiz-option-${label}`}
              className="bg-white border border-jlt-black/15 hover:border-jlt-gold p-5 text-center transition">
              <div className="font-display text-lg">{label}</div>
            </button>
          );
        })}
      </div>
      {step > 0 && <button onClick={() => setStep(step - 1)} className="mt-8 text-xs tracking-[0.2em] uppercase text-jlt-black/60" data-testid="quiz-back">← Back</button>}
    </div>
  );
};
export default FindYourScent;
