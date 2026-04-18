"use client";

import * as React from "react";
import { Command } from "cmdk";
import { ChevronsUpDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type Option = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
};

type Props = {
  name: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  onChange?: (value: string) => void;
  className?: string;
};

export function SearchableSelect({
  name,
  options,
  value: controlledValue,
  defaultValue = "",
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No match.",
  required,
  disabled,
  clearable = true,
  onChange,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (v: string) => {
    if (controlledValue === undefined) setInternalValue(v);
    onChange?.(v);
  };

  const selected = options.find((o) => o.value === value);

  // Group options if any have a group attribute
  const hasGroups = options.some((o) => o.group);
  const grouped = React.useMemo(() => {
    if (!hasGroups) return null;
    const map = new Map<string, Option[]>();
    for (const o of options) {
      const g = o.group ?? "Other";
      const list = map.get(g) ?? [];
      list.push(o);
      map.set(g, list);
    }
    return Array.from(map.entries());
  }, [options, hasGroups]);

  return (
    <>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-1 text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-50",
              !selected && "text-[var(--color-text-muted)]",
              className,
            )}
          >
            <span className="truncate">
              {selected ? selected.label : placeholder}
            </span>
            <div className="flex items-center gap-1">
              {clearable && selected && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue("");
                  }}
                  className="rounded-sm p-0.5 hover:bg-[var(--color-bg-elevated)]"
                >
                  <X className="size-3 text-[var(--color-text-muted)]" />
                </span>
              )}
              <ChevronsUpDown className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
          <Command className="flex flex-col overflow-hidden" filter={(itemValue, search) => {
            if (!search) return 1;
            const s = search.toLowerCase();
            return itemValue.toLowerCase().includes(s) ? 1 : 0;
          }}>
            <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-2">
              <Search className="size-3.5 text-[var(--color-text-muted)]" />
              <Command.Input
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              />
            </div>
            <Command.List className="max-h-[280px] overflow-y-auto p-1">
              <Command.Empty className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                {emptyMessage}
              </Command.Empty>

              {grouped
                ? grouped.map(([group, items]) => (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="mb-1 [&_[cmdk-group-heading]]:mb-0.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--color-text-muted)]"
                    >
                      {items.map((o) => (
                        <OptionRow
                          key={o.value}
                          option={o}
                          selected={o.value === value}
                          onPick={() => {
                            if (!o.disabled) {
                              setValue(o.value);
                              setOpen(false);
                            }
                          }}
                        />
                      ))}
                    </Command.Group>
                  ))
                : options.map((o) => (
                    <OptionRow
                      key={o.value}
                      option={o}
                      selected={o.value === value}
                      onPick={() => {
                        if (!o.disabled) {
                          setValue(o.value);
                          setOpen(false);
                        }
                      }}
                    />
                  ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={value} required={required} />
    </>
  );
}

function OptionRow({ option, selected, onPick }: { option: Option; selected: boolean; onPick: () => void }) {
  return (
    <Command.Item
      value={`${option.label} ${option.description ?? ""}`}
      onSelect={onPick}
      disabled={option.disabled}
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--color-text-primary)] data-[selected=true]:bg-[var(--color-bg-overlay)] data-[disabled=true]:opacity-50",
      )}
    >
      <Check className={cn("mt-0.5 size-3.5 shrink-0", selected ? "text-[var(--color-brand)]" : "text-transparent")} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px]">{option.label}</div>
        {option.description && (
          <div className="truncate text-[10px] text-[var(--color-text-muted)]">{option.description}</div>
        )}
      </div>
    </Command.Item>
  );
}
