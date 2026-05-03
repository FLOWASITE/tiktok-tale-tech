import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface LazyOption {
  value: string;
  label: string;
  color?: string | null;
}

interface Props {
  value: string | null;
  options: LazyOption[];
  placeholder: string;
  noneLabel: string;
  onChange: (value: string | null) => void;
  className?: string;
}

/**
 * Select wrapper that defers mounting <SelectContent> options until the user
 * opens the dropdown for the first time. Cuts initial render cost when many
 * Selects are visible (e.g. orphan keyword table — 25 rows × 2 selects).
 *
 * Trigger still shows the current label via SelectValue (built-in display).
 */
export function LazyAssignSelect({
  value,
  options,
  placeholder,
  noneLabel,
  onChange,
  className,
}: Props) {
  const [opened, setOpened] = useState(false);
  const current = value ?? "__none__";
  // Until first open, render only the currently-selected option (so SelectValue
  // can show its label). After opening once, render the full list.
  const visibleOptions = opened
    ? options
    : options.filter((o) => o.value === current);

  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      onOpenChange={(o) => o && setOpened(true)}
    >
      <SelectTrigger className={className ?? "h-8 text-xs"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{noneLabel}</SelectItem>
        {visibleOptions.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.color !== undefined ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: o.color || "#6B7280" }}
                />
                {o.label}
              </span>
            ) : (
              o.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
