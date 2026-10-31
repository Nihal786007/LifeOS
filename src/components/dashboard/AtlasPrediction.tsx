interface AtlasPredictionProps {
  successChance: number;
  burnoutRisk: number;
}

export default function AtlasPrediction({
  successChance,
  burnoutRisk,
}: AtlasPredictionProps) {
  return (
    <div className="rounded-3xl border border-lifeos-border bg-lifeos-surface p-6">
      <h2 className="text-xl font-bold text-lifeos-success">
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