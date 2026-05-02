import { Check, X, Minus } from "lucide-react";

interface ComparisonTableProps {
  headers: string[]; // first cell is feature label, rest are competitor names
  rows: Array<{
    feature: string;
    values: Array<string | boolean>;
  }>;
  highlightColumnIndex?: number; // 1-indexed (excluding feature col); usually 1 = Flowa
  title?: string;
}

function renderCell(v: string | boolean) {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-primary" aria-label="Có" />;
  if (v === false) return <X className="mx-auto h-5 w-5 text-muted-foreground/50" aria-label="Không" />;
  if (!v || v === "-") return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="Không có dữ liệu" />;
  return <span className="text-sm">{v}</span>;
}

export function ComparisonTable({
  headers,
  rows,
  highlightColumnIndex = 1,
  title,
}: ComparisonTableProps) {
  if (!headers?.length || !rows?.length) return null;

  return (
    <section data-geo-block="comparison-table" className="my-10">
      {title && <h2 className="mb-6 text-2xl font-semibold">{title}</h2>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`border-b border-border px-4 py-3 text-left font-semibold ${
                    i === highlightColumnIndex ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/20">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {row.feature}
                </th>
                {row.values.map((v, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-3 text-center ${
                      ci + 1 === highlightColumnIndex ? "bg-primary/5" : ""
                    }`}
                  >
                    {renderCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
