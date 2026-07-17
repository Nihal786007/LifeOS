type ProgressRingProps = {
  value: number;
};

export default function ProgressRing({
  value,
}: ProgressRingProps) {
  const radius = 60;
  const stroke = 10;

  const normalizedRadius = radius - stroke / 2;

  const circumference =
    normalizedRadius * 2 * Math.PI;

  const offset =
    circumference -
    (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">

      <svg
        width={140}
        height={140}
        className="-rotate-90"
      >

        <circle
          cx="70"
          cy="70"
          r={normalizedRadius}
          stroke="#1e293b"
          strokeWidth={stroke}
          fill="transparent"
        />

        <circle
          cx="70"
          cy="70"
          r={normalizedRadius}
          stroke="#06b6d4"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset .8s ease",
          }}
        />

      </svg>

      <div className="-mt-24 text-center">

        <h2 className="text-4xl font-black">
          {value}%
        </h2>

        <p className="mt-1 text-sm uppercase tracking-widest text-slate-500">
          Progress
        </p>

      </div>

    </div>
  );
}