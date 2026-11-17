import type { FeeForecast } from "@/lib/services/forecastService";
import { formatMoney } from "@/lib/format";

interface Props {
  forecast: FeeForecast | null;
  loading?: boolean;
}

export default function FeeForecastCard({ forecast, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 animate-pulse">
        <div className="h-5 w-48 bg-[#2A2A2A] rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-16 bg-[#2A2A2A] rounded-lg" />
          <div className="h-16 bg-[#2A2A2A] rounded-lg" />
          <div className="h-16 bg-[#2A2A2A] rounded-lg" />
        </div>
      </div>
    );
  }

  if (!forecast || forecast.totalBatches === 0) {
    return (
      <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F5F0E8] flex items-center gap-2">
            <span>📈</span> Hallmarking Expense & Volume Forecast
          </h2>
          <span className="text-xs text-[#6B6355]">Awaiting batch data</span>
        </div>
        <p className="mt-2 text-sm text-[#A09880]">
          Create batches and submit articles to unlock automated monthly and annual hallmarking cost projections.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3A3A3A] bg-[#1C1C1C] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#F5F0E8] flex items-center gap-2">
            <span>📈</span> Hallmarking Cost & Volume Forecast
          </h2>
          <p className="text-xs text-[#A09880] mt-0.5">
            Analyzed across {forecast.totalBatches} batches ({forecast.totalArticles} total articles)
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            forecast.isCloudComputed
              ? "bg-purple-900/40 text-purple-300 border border-purple-700/50"
              : "bg-[#2A2A2A] text-[#A09880] border border-[#3A3A3A]"
          }`}
        >
          {forecast.isCloudComputed ? "⚡ Cloud Function v2" : "Client Projected"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Avg Volume */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
          <p className="text-xs font-medium text-[#A09880]">Monthly Average Volume</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#F5F0E8]">
              {forecast.monthlyAverageArticles}
            </span>
            <span className="text-xs text-[#6B6355]">articles / mo</span>
          </div>
          <p className="mt-1 text-xs text-[#6B6355]">
            Based on {forecast.monthsActive} active month{forecast.monthsActive === 1 ? "" : "s"}
          </p>
        </div>

        {/* Projected Monthly Expense */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
          <p className="text-xs font-medium text-[#A09880]">Est. Monthly Expense</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#C9A227]">
              {formatMoney(forecast.estimatedMonthlyFee)}
            </span>
            <span className="text-xs text-[#6B6355]">/ month</span>
          </div>
          <p className="mt-1 text-xs text-[#6B6355]">
            At ₹{forecast.feePerItem}/article standard rate
          </p>
        </div>

        {/* Projected Annual Expense */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
          <p className="text-xs font-medium text-[#A09880]">Projected Annual Expense</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400">
              {formatMoney(forecast.estimatedYearlyFee)}
            </span>
            <span className="text-xs text-[#6B6355]">/ year</span>
          </div>
          <p className="mt-1 text-xs text-[#6B6355]">
            12-month projected pipeline
          </p>
        </div>
      </div>
    </div>
  );
}
