interface AtlasPredictionProps {
  successChance: number;
  burnoutRisk: number;
}

export default function AtlasPrediction({
  successChance,
  burnoutRisk,
}: AtlasPredictionProps) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h2 className="text-xl font-bold text-green-400">
        📈 Prediction
      </h2>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between">
          <span>Success Chance</span>
          <span>{successChance}%</span>
        </div>

        <div className="flex justify-between">
          <span>Burnout Risk</span>
          <span>{burnoutRisk}%</span>
        </div>
      </div>
    </div>
  );
}