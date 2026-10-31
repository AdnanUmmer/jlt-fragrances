import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import http from "../lib/api";
import { useCart } from "../lib/store";

const steps = [
  { key: "family", label: "Style", title: "What kind of fragrance do you enjoy?" },
  { key: "occasion", label: "Occasion", title: "When would you wear it?" },
  { key: "intensity", label: "Intensity", title: "How strong do you like your fragrance?" },
  { key: "audience", label: "For", title: "Who are you shopping for?" },
  { key: "spend", label: "Budget", title: "What's your budget?" },
];

const FindYourScent = () => {
  const [answers, setAnswers] = useState({});
  const [answerLabels, setAnswerLabels] = useState({});
  const [alternatives, setAlternatives] = useState(false);
  const nextStep = steps.findIndex(({ key }) => answers[key] === undefined);
  const step = nextStep === -1 ? steps.length - 1 : nextStep;
  const [added, setAdded] = useState("");
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { addToCart } = useCart();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setOptions([]);
    setResults(null);
    const complete = steps.every(({ key }) => answers[key] !== undefined);
    http.post(complete ? "/quiz/recommend" : "/quiz/options", { ...answers, flow: "quick" }, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const expected = steps.find(({ key }) => answers[key] === undefined);
        if (!Array.isArray(complete ? data.items : data.options) ||
            (!complete && (data.step !== expected.key || data.options.length > 6)) ||
            (complete && data.items.some(product => !product.quiz_match))) {
          throw new Error("Quiz response does not match the current question");
        }
        setAlternatives(Boolean(data.alternatives));
        if (complete) {
          setResults(data.items);
          setTotal(data.total);
          setOptions([]);
        } else {
          setResults(null);
          setOptions(data.options);
          setTotal(data.total);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.code !== "ERR_CANCELED") setError("We couldn't load your matches. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [answers, retry]);

  const choose = (value) => {
    if (loading || error || !options.some(option => option.value === value && option.count > 0)) return;
    setAnswerLabels(current => ({ ...current, [steps[step].key]: options.find(option => option.value === value).label }));
    setLoading(true);
    setResults(null);
    setOptions([]);
    setAnswers((current) => ({ ...Object.fromEntries(steps.slice(0, step).map(({ key }) => [key, current[key]])), [steps[step].key]: value }));
  };

  const goToStep = (index) => {
    setAnswers(Object.fromEntries(steps.slice(0, index).map(({ key }) => [key, answers[key]])));
    setLoading(true);
    setOptions([]);
    setAdded("");
    setResults(null);
  };

  const reset = () => {
    setLoading(true);
    setOptions([]);
    setAdded("");
    setAnswers({});
    setAnswerLabels({});
    setResults(null);
    setTotal(0);
  };

  const answerSummary = (
    <div className="flex flex-wrap justify-center gap-2 mt-5" aria-label="Your selected answers">
      {steps.map(({ key, label, title }, index) => answers[key] !== undefined && (
        <button key={key} type="button" onClick={() => goToStep(index)}
          className="border border-jlt-black/15 bg-white px-3 py-2 text-xs hover:border-jlt-gold"
          aria-label={`Change ${title}: ${answerLabels[key]}`}>
          <span className="text-jlt-black/50">{label}: </span>
          {answerLabels[key]}
        </button>
      ))}
    </div>
  );

  if (results) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12" data-testid="quiz-results">
        <div className="text-center">
          <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Your Results</div>
          <h1 className="font-display text-4xl sm:text-5xl mt-2">Your best matches</h1>
          <p className="text-sm text-jlt-black/60 mt-3">{results.length} fragrance{results.length === 1 ? "" : "s"}, chosen for your style. {alternatives && "We’ve included clearly marked alternatives to explore."}</p>
          {answerSummary}
          {total > 0 && total <= 3 && <p className="text-sm mt-3 text-jlt-black/60">A focused selection. Change an answer above to explore more fragrances.</p>}
          {added && <p role="status" className="text-sm mt-3">{added} added to your cart. <Link to="/cart" className="underline">View cart</Link></p>}
          <button onClick={reset} className="btn-outline mt-4" data-testid="retake-quiz">Start again</button>
        </div>
        {results.length === 0 ? (
          <div className="text-center text-jlt-black/60 mt-10">
            These combined preferences are very specific. Change one of your answers above or <Link className="text-jlt-gold" to="/shop">browse all fragrances</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {results.map((product) => {
              const match = product.quiz_match;
              return (
                <article key={product.slug} className="bg-white border border-jlt-black/10 p-4" data-testid={`quiz-result-${product.slug}`}>
                  <div className="text-xs text-jlt-gold mb-3">{match.exact ? "Matches your preferences" : "Alternative to explore"}</div>
                  <Link to={`/product/${product.slug}`} className="block">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} loading="lazy" className="w-full aspect-[4/3] object-cover bg-jlt-bone" />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-jlt-bone flex items-center justify-center font-display text-xl text-jlt-black/60">{product.name}</div>
                    )}
                    <div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-gold mt-4">{product.brand_inspiration}</div>
                    <h2 className="font-display text-xl mt-1">{product.name}</h2>
                  </Link>
                  <p className="mt-2 text-lg">₹{match.price} <span className="text-sm text-jlt-black/60">· {match.size}</span></p>
                  <div className="mt-4">
                    <div className="text-[0.65rem] tracking-[0.2em] uppercase text-jlt-black/50">{match.exact ? "Why you might love it" : "How it compares"}</div>
                    <ul className="mt-2 space-y-1 text-sm text-jlt-black/70">
                      {match.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
                      {(match.differences || []).map(reason => <li key={reason} className="font-medium text-jlt-black">{reason}</li>)}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <Link to={`/product/${product.slug}`} className="btn-outline">Product details</Link>
                    <button onClick={() => { addToCart(product, match.size); setAdded(product.name); }} className="btn-primary" data-testid={`quiz-add-to-cart-${product.slug}`}>
                      <ShoppingBag size={14} /> Add to Cart
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const current = steps[step];
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12" data-testid="quiz-page">
      <div className="text-center mb-8">
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-jlt-gold">Find Your Scent — Step {step + 1} of {steps.length}</div>
        <p className="text-xs text-jlt-black/60 mt-2">Five quick questions. A scent that feels like you.</p>
        <h1 className="font-display text-3xl sm:text-4xl mt-3">{current.title}</h1>
        <div role="progressbar" aria-label="Quiz progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} className="w-full bg-jlt-black/10 h-1 mt-6 max-w-md mx-auto">
          <div className="bg-jlt-gold h-1 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        {answerSummary}
      </div>
      <p className="text-center text-xs text-jlt-black/60 mb-4" aria-live="polite">
        {loading ? "Finding available matches…" : alternatives ? "Let’s explore the closest available options." : `${total} available fragrance${total === 1 ? "" : "s"} to explore`}
      </p>
      {loading && <p role="status" className="sr-only">Finding available options…</p>}
      {error && <div role="alert" className="text-center">{error} <button className="btn-outline" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
      {!loading && !error && options.length === 0 && (
        <p className="text-center">
          These preferences are too narrow, or the remaining fragrances lack the details needed for this question. Change an answer above or <button type="button" className="underline" onClick={reset}>start again</button>.
        </p>
      )}
      <div key={step} className="grid grid-cols-2 sm:grid-cols-3 gap-3 fade-in">
        {!loading && !error && options.map((option) => (
          <button key={option.value} disabled={loading || option.count === 0} onClick={() => choose(option.value)}
            data-testid={`quiz-option-${option.label}`}
            className="bg-white border border-jlt-black/15 enabled:hover:border-jlt-gold disabled:opacity-40 disabled:cursor-not-allowed min-h-[112px] p-4 sm:p-5 text-center transition-colors duration-200">
            <div className="font-display text-lg">{option.label}</div>
            {option.description && <div className="text-xs mt-2 text-jlt-black/60 leading-relaxed">{option.description}</div>}
          </button>
        ))}
      </div>
      {step > 0 && <button onClick={() => goToStep(step - 1)} className="mt-8 text-xs tracking-[0.2em] uppercase text-jlt-black/60" data-testid="quiz-back">← Back</button>}
    </div>
  );
};

export default FindYourScent;
