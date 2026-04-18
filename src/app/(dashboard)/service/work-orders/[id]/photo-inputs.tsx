"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Loader2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addVisitPhoto, removeVisitPhoto } from "@/server/work-orders/photo-actions";

type Photo = { url: string; caption?: string };

export function PhotoInputs({
  workOrderId,
  beforePhotos,
  afterPhotos,
  editable,
}: {
  workOrderId: string;
  beforePhotos: Photo[];
  afterPhotos: Photo[];
  editable: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel workOrderId={workOrderId} kind="before" photos={beforePhotos} editable={editable} />
      <Panel workOrderId={workOrderId} kind="after" photos={afterPhotos} editable={editable} />
    </div>
  );
}

function Panel({
  workOrderId,
  kind,
  photos,
  editable,
}: {
  workOrderId: string;
  kind: "before" | "after";
  photos: Photo[];
  editable: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [localPhotos, setLocalPhotos] = React.useState(photos);

  React.useEffect(() => setLocalPhotos(photos), [photos]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    startTransition(async () => {
      try {
        await addVisitPhoto(workOrderId, kind, url.trim(), caption.trim());
        setLocalPhotos((p) => [...p, { url: url.trim(), caption: caption.trim() }]);
        setUrl("");
        setCaption("");
        toast.success(`${kind === "before" ? "Before" : "After"} photo added`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add photo");
      }
    });
  }

  async function remove(photoUrl: string) {
    startTransition(async () => {
      try {
        await removeVisitPhoto(workOrderId, kind, photoUrl);
        setLocalPhotos((p) => p.filter((ph) => ph.url !== photoUrl));
        toast.success("Photo removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove");
      }
    });
  }

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Camera className="size-3.5 text-[var(--color-text-muted)]" />
          {kind === "before" ? "Before" : "After"} photos ({localPhotos.length})
        </div>
      </div>

      {localPhotos.length === 0 ? (
        <div className="mb-2 rounded-md border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]/40 p-4 text-center text-[10px] text-[var(--color-text-muted)]">
          No {kind} photos yet
        </div>
      ) : (
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {localPhotos.map((p, i) => (
            <div key={i} className="group relative overflow-hidden rounded-md border border-[var(--color-border-subtle)]">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? "photo"}
                  className="h-20 w-full bg-[var(--color-bg-elevated)] object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                  }}
                />
                <div className="hidden h-20 items-center justify-center bg-[var(--color-bg-elevated)] text-[10px] text-[var(--color-text-muted)]">
                  <ExternalLink className="size-3" />
                </div>
              </a>
              {editable && (
                <button
                  type="button"
                  onClick={() => remove(p.url)}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-sm bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <X className="size-3" />
                </button>
              )}
              {p.caption && (
                <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <form onSubmit={submit} className="space-y-1.5">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste image URL…"
            className="h-7 text-[11px]"
          />
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="h-7 text-[11px]"
          />
          <Button type="submit" size="sm" variant="secondary" className="w-full" disabled={pending || !url.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />}
            Add {kind} photo
          </Button>
        </form>
      )}
    </div>
  );
}
