type ProgressRingProps = {
  percentage: number;
};

export default function ProgressRing({
  percentage,
}: ProgressRingProps) {
  const radius = 80;
  const stroke = 12;

  const normalizedRadius = radius - stroke / 2;

  const circumference =
    normalizedRadius * 2 * Math.PI;

  const strokeDashoffset =
    circumference -
    (percentage / 100) * circumference;

  return (
    <div className="bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center h-[380px]">

      <h2 className="text-2xl font-bold mb-6">
        🎯 Completion Rate
      </h2>

      <svg
        height={radius * 2}
        width={radius * 2}
      >
        <circle
          stroke="#334155"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <circle
          stroke="#3b82f6"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            transition: "stroke-dashoffset 0.6s ease",
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />

        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-white text-2xl font-bold"
        >
          {percentage}%
        </text>
      </svg>

    </div>
  );
}