import * as React from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
};

export function SimpleTable<T>({
  data,
  columns,
  rowHref,
  emptyTitle = "No records",
  emptyDescription,
  getKey,
}: {
  data: T[];
  columns: Column<T>[];
  rowHref?: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  getKey?: (row: T, i: number) => string;
}) {
  if (!data.length) {
    return (
      <EmptyState
        icon={<Inbox className="size-4" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={cn(
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className,
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => {
            const href = rowHref?.(row);
            return (
              <TableRow key={getKey?.(row, i) ?? i} className={cn(href && "cursor-pointer")}>
                {columns.map((c) => {
                  const content = c.accessor(row);
                  return (
                    <TableCell
                      key={c.key}
                      className={cn(
                        "p-0",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.className,
                      )}
                    >
                      {href ? (
                        <Link
                          href={href}
                          className={cn(
                            "block px-3 py-2",
                            c.align === "right" && "text-right",
                            c.align === "center" && "text-center",
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          className={cn(
                            "px-3 py-2",
                            c.align === "right" && "text-right",
                            c.align === "center" && "text-center",
                          )}
                        >
                          {content}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
