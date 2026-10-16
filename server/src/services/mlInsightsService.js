/**
 * Lightweight ML insights, mirroring the earlier Python prototype:
 * - Outlier detection via z-score (simple, explainable, no training needed).
 * - Trend forecasting via linear regression (good enough for a demo-scope tool).
 */

export function detectOutliers(rows, column, threshold = 2.5) {
  const values = rows
    .map((r) => r[column])
    .filter((v) => typeof v === "number" && !isNaN(v));

  if (values.length === 0) {
    throw new Error(`Column "${column}" has no numeric values.`);
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return { mean, stdDev, outliers: [] };

  const outliers = rows.filter((r) => {
    const v = r[column];
    if (typeof v !== "number" || isNaN(v)) return false;
    const z = (v - mean) / stdDev;
    return Math.abs(z) > threshold;
  });

  return { mean, stdDev, outliers };
}

export function forecastTrend(rows, dateColumn, valueColumn, periodsAhead = 5) {
  const points = rows
    .filter((r) => r[dateColumn] && typeof r[valueColumn] === "number")
    .map((r) => ({ date: new Date(r[dateColumn]), value: r[valueColumn] }))
    .sort((a, b) => a.date - b.date);

  if (points.length < 2) {
    throw new Error("Not enough data points to forecast a trend.");
  }

  // Simple linear regression: value = slope * index + intercept
  const n = points.length;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.value);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  const lastDate = points[n - 1].date;
  const avgIntervalMs =
    n > 1 ? (points[n - 1].date - points[0].date) / (n - 1) : 24 * 60 * 60 * 1000;

  const historical = points.map((p, i) => ({
    date: p.date.toISOString().slice(0, 10),
    value: p.value,
    type: "actual",
  }));

  const forecast = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const index = n - 1 + i;
    const predictedValue = slope * index + intercept;
    const predictedDate = new Date(lastDate.getTime() + avgIntervalMs * i);
    forecast.push({
      date: predictedDate.toISOString().slice(0, 10),
      value: Math.round(predictedValue * 100) / 100,
      type: "forecast",
    });
  }

  return { slope, intercept, series: [...historical, ...forecast] };
}