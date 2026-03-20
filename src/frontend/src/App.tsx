import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  BookOpen,
  CheckCheck,
  Clock,
  Code,
  Copy,
  ExternalLink,
  Film,
  Info,
  Play,
  Scissors,
  Share2,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Clip } from "./backend";
import { DualRangeSlider } from "./components/DualRangeSlider";
import { useCreateClip, useDeleteClip, useGetClips } from "./hooks/useQueries";

/* ── helpers ── */
function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed) return embed[1];
    }
    return null;
  } catch {
    return null;
  }
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

interface Segment {
  index: number;
  start: number;
  end: number;
  link: string;
  embedUrl: string;
}

function buildSegments(videoId: string, duration: number): Segment[] {
  const segments: Segment[] = [];
  const segLen = 30;
  let i = 0;
  let seg = 0;
  while (i < duration) {
    const start = i;
    const end = Math.min(i + segLen, duration);
    segments.push({
      index: seg + 1,
      start,
      end,
      link: `https://youtu.be/${videoId}?t=${start}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?start=${start}&end=${end}`,
    });
    i += segLen;
    seg++;
  }
  return segments;
}

const DEFAULT_DURATION = 300;

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(DEFAULT_DURATION);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedEmbed, setGeneratedEmbed] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showSegments, setShowSegments] = useState(false);

  const { data: clips = [], isLoading: clipsLoading } = useGetClips();
  const createClip = useCreateClip();
  const deleteClip = useDeleteClip();

  const handleLoadVideo = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError("Please enter a YouTube URL");
      return;
    }
    const id = extractVideoId(trimmed);
    if (!id) {
      setUrlError(
        "Invalid YouTube URL. Supported: youtube.com/watch?v=, youtu.be/, youtube.com/embed/",
      );
      return;
    }
    setUrlError("");
    setVideoId(id);
    setStartTime(0);
    setEndTime(DEFAULT_DURATION);
    setDuration(DEFAULT_DURATION);
    setGeneratedLink("");
    setGeneratedEmbed("");
    setSegments([]);
    setShowSegments(false);
  }, [urlInput]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleLoadVideo();
    },
    [handleLoadVideo],
  );

  const handleStartInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(0, Math.min(Number(e.target.value), endTime - 1));
      setStartTime(v);
    },
    [endTime],
  );

  const handleEndInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(
        startTime + 1,
        Math.min(Number(e.target.value), duration),
      );
      setEndTime(v);
    },
    [startTime, duration],
  );

  const handleDurationInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(10, Number(e.target.value));
      setDuration(v);
      setEndTime((prev) => Math.min(prev, v));
      setSegments([]);
      setShowSegments(false);
    },
    [],
  );

  const handleGenerateLink = useCallback(() => {
    if (!videoId) return;
    const link = `https://youtu.be/${videoId}?t=${Math.round(startTime)}`;
    const embed = `https://www.youtube.com/embed/${videoId}?start=${Math.round(startTime)}&end=${Math.round(endTime)}`;
    setGeneratedLink(link);
    setGeneratedEmbed(embed);
  }, [videoId, startTime, endTime]);

  const handleSplitSegments = useCallback(() => {
    if (!videoId) return;
    const segs = buildSegments(videoId, duration);
    setSegments(segs);
    setShowSegments(true);
  }, [videoId, duration]);

  const handleCopyAllLinks = useCallback(() => {
    const text = segments
      .map(
        (s) =>
          `Part ${s.index} (${formatTime(s.start)} – ${formatTime(s.end)}): ${s.link}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${segments.length} segment links!`);
  }, [segments]);

  const handleCopySegmentLink = useCallback((link: string, index: number) => {
    navigator.clipboard.writeText(link);
    toast.success(`Part ${index} link copied!`);
  }, []);

  const handleSaveClip = useCallback(async () => {
    if (!videoId || !generatedLink) return;
    setIsSaving(true);
    try {
      const title = `Clip ${videoId} [${formatTime(startTime)}-${formatTime(endTime)}]`;
      await createClip.mutateAsync({
        title,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        startTime,
        endTime,
      });
      toast.success("Clip saved!");
    } catch {
      toast.error("Failed to save clip");
    } finally {
      setIsSaving(false);
    }
  }, [videoId, generatedLink, startTime, endTime, createClip]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied!");
  }, [generatedLink]);

  const handleCopyEmbed = useCallback(() => {
    const embedCode = `<iframe width="560" height="315" src="${generatedEmbed}" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("Embed code copied!");
  }, [generatedEmbed]);

  const handleLoadClip = useCallback((clip: Clip) => {
    const id = extractVideoId(clip.videoUrl);
    if (!id) return;
    const start = Number(clip.startTime);
    const end = Number(clip.endTime);
    setVideoId(id);
    setUrlInput(clip.videoUrl);
    setStartTime(start);
    setEndTime(end);
    setDuration(Math.max(end + 10, DEFAULT_DURATION));
    setGeneratedLink("");
    setGeneratedEmbed("");
    setSegments([]);
    setShowSegments(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDeleteClip = useCallback(
    async (id: bigint) => {
      try {
        await deleteClip.mutateAsync(id);
        toast.success("Clip deleted");
      } catch {
        toast.error("Failed to delete clip");
      }
    },
    [deleteClip],
  );

  const clipDuration = endTime - startTime;
  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(window.location.hostname);

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster theme="dark" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 border-b border-border bg-[oklch(0.11_0_0/0.85)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-teal" />
          </div>
          <span className="text-xl font-bold text-teal tracking-tight">
            YT Clip
          </span>
        </div>
        <div className="ml-auto text-sm text-muted-foreground hidden sm:block">
          Free YouTube timestamp trimmer
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2 mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Trim &amp; Share YouTube Clips
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Generate shareable YouTube links starting at any timestamp — free,
              instant, no downloads.
            </p>
          </motion.div>

          {/* Info banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border text-sm text-muted-foreground"
          >
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-teal" />
            <p>
              This tool generates a shareable YouTube link starting at your
              chosen timestamp. For full video download, use YouTube&apos;s
              offline feature.
            </p>
          </motion.div>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              YouTube URL
            </Label>
            <div className="flex gap-2">
              <Input
                data-ocid="url.input"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError("");
                }}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                className="teal-input flex-1 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0"
              />
              <Button
                data-ocid="url.primary_button"
                onClick={handleLoadVideo}
                className="h-12 px-5 bg-teal text-[oklch(0.10_0_0)] font-semibold hover:bg-teal/90 shrink-0"
              >
                <Play className="w-4 h-4 mr-1" />
                Load
              </Button>
            </div>
            <AnimatePresence>
              {urlError && (
                <motion.p
                  data-ocid="url.error_state"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-destructive text-xs"
                >
                  {urlError}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Trimming Card */}
          <AnimatePresence>
            {videoId && (
              <motion.div
                data-ocid="trimmer.card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="rounded-xl bg-card border border-border p-5 space-y-5 shadow-card"
              >
                <h2 className="text-lg font-bold text-foreground">
                  Trim Video
                </h2>

                {/* YouTube Player */}
                <div className="rounded-lg overflow-hidden aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video player"
                  />
                </div>

                {/* Duration override */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground shrink-0">
                    Video duration (s):
                  </Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={handleDurationInput}
                    className="w-24 h-8 text-sm bg-muted border-border teal-input focus-visible:ring-0"
                  />
                  <span className="text-xs text-muted-foreground">
                    ({formatTime(duration)})
                  </span>
                </div>

                {/* Dual slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(startTime)}</span>
                    <span className="text-teal font-medium">
                      Clip: {formatDuration(clipDuration)}
                    </span>
                    <span>{formatTime(endTime)}</span>
                  </div>
                  <DualRangeSlider
                    min={0}
                    max={duration}
                    start={startTime}
                    end={endTime}
                    onStartChange={setStartTime}
                    onEndChange={setEndTime}
                  />
                </div>

                {/* Manual time inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Start (seconds)
                    </Label>
                    <Input
                      data-ocid="trimmer.input"
                      type="number"
                      value={startTime}
                      onChange={handleStartInput}
                      min={0}
                      max={endTime - 1}
                      className="h-9 bg-muted border-border teal-input focus-visible:ring-0"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatTime(startTime)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      End (seconds)
                    </Label>
                    <Input
                      type="number"
                      value={endTime}
                      onChange={handleEndInput}
                      min={startTime + 1}
                      max={duration}
                      className="h-9 bg-muted border-border teal-input focus-visible:ring-0"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatTime(endTime)}
                    </p>
                  </div>
                </div>

                {/* Generate button */}
                <Button
                  data-ocid="trimmer.primary_button"
                  onClick={handleGenerateLink}
                  className="w-full h-11 bg-teal text-[oklch(0.10_0_0)] font-semibold hover:bg-teal/90 shadow-teal"
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Generate Trimmed Link
                </Button>

                {/* Split into 30s segments button */}
                <Button
                  data-ocid="trimmer.secondary_button"
                  onClick={handleSplitSegments}
                  variant="outline"
                  className="w-full h-11 border-teal/40 text-teal hover:bg-teal/10 hover:border-teal font-semibold"
                >
                  <Film className="w-4 h-4 mr-2" />
                  Split into 30s Segments
                  {duration > 0 && (
                    <span className="ml-2 text-xs bg-teal/20 text-teal px-2 py-0.5 rounded-full">
                      {Math.ceil(duration / 30)} parts
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result Card */}
          <AnimatePresence>
            {generatedLink && (
              <motion.div
                data-ocid="result.card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-xl bg-card border border-teal/30 p-5 space-y-4 shadow-teal"
              >
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                  Your Trimmed Link
                </h2>

                {/* Link display */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                  <ExternalLink className="w-3.5 h-3.5 text-teal shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1 font-mono">
                    {generatedLink}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-ocid="result.primary_button"
                    onClick={handleCopyLink}
                    className="bg-teal text-[oklch(0.10_0_0)] font-semibold hover:bg-teal/90"
                    size="sm"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Link
                  </Button>
                  <Button
                    data-ocid="result.secondary_button"
                    onClick={handleCopyEmbed}
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground hover:bg-muted"
                  >
                    <Code className="w-3.5 h-3.5 mr-1.5" />
                    Copy Embed
                  </Button>
                  <a
                    data-ocid="result.link"
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent("Check out this YouTube clip!")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-foreground hover:bg-muted"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />
                      Share on X
                    </Button>
                  </a>
                  <Button
                    data-ocid="result.save_button"
                    onClick={handleSaveClip}
                    disabled={isSaving}
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground hover:bg-muted ml-auto"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    {isSaving ? "Saving..." : "Save Clip"}
                  </Button>
                </div>

                {/* Embed URL info */}
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    Embed URL (with start &amp; end):
                  </p>
                  <p className="text-xs text-teal-dim font-mono break-all">
                    {generatedEmbed}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 30s Segments Panel */}
          <AnimatePresence>
            {showSegments && segments.length > 0 && (
              <motion.div
                data-ocid="segments.panel"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="rounded-xl bg-card border border-teal/40 p-5 space-y-4 shadow-teal"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal/15 flex items-center justify-center">
                      <Film className="w-4 h-4 text-teal" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground leading-none">
                        30-Second Segments
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {segments.length} parts · {formatTime(duration)} total
                      </p>
                    </div>
                  </div>
                  <Button
                    data-ocid="segments.primary_button"
                    onClick={handleCopyAllLinks}
                    size="sm"
                    className="bg-teal text-[oklch(0.10_0_0)] font-semibold hover:bg-teal/90 shrink-0"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                    Copy All Links
                  </Button>
                </div>

                {/* Segment grid */}
                <div className="max-h-[520px] overflow-y-auto pr-1 space-y-2 scrollbar-segments">
                  {segments.map((seg, idx) => (
                    <motion.div
                      key={seg.index}
                      data-ocid={`segments.item.${idx + 1}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                      className="group flex items-center gap-3 p-3 rounded-lg bg-muted border border-border hover:border-teal/40 transition-all"
                    >
                      {/* Part badge */}
                      <div className="w-9 h-9 rounded-md bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-teal">
                          {seg.index}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Part {seg.index}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatTime(seg.start)} – {formatTime(seg.end)}
                          <span className="ml-2 text-muted-foreground/60">
                            ({formatDuration(seg.end - seg.start)})
                          </span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          data-ocid={`segments.secondary_button.${idx + 1}`}
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleCopySegmentLink(seg.link, seg.index)
                          }
                          className="h-8 px-2.5 text-xs text-teal hover:text-teal hover:bg-teal/10 border border-transparent hover:border-teal/30"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <a
                          data-ocid={`segments.link.${idx + 1}`}
                          href={seg.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </Button>
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved Clips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal" />
              Saved Clips
            </h2>

            {clipsLoading ? (
              <div data-ocid="clips.loading_state" className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-card border border-border animate-pulse"
                  />
                ))}
              </div>
            ) : clips.length === 0 ? (
              <div
                data-ocid="clips.empty_state"
                className="flex flex-col items-center justify-center p-8 rounded-xl bg-card border border-border text-center"
              >
                <Scissors className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No saved clips yet.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Generate a link and save your first clip!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {clips.map((clip, idx) => (
                  <motion.div
                    key={String(clip.id)}
                    data-ocid={`clips.item.${idx + 1}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-teal/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-md bg-teal/10 flex items-center justify-center shrink-0">
                      <Scissors className="w-3.5 h-3.5 text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {clip.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(Number(clip.startTime))} –{" "}
                        {formatTime(Number(clip.endTime))}
                        &nbsp;·&nbsp;
                        {formatDuration(
                          Number(clip.endTime) - Number(clip.startTime),
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        data-ocid={`clips.edit_button.${idx + 1}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLoadClip(clip)}
                        className="h-7 px-2 text-teal hover:text-teal hover:bg-teal/10"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Load
                      </Button>
                      <Button
                        data-ocid={`clips.delete_button.${idx + 1}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClip(clip.id)}
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {year}. Built with <span className="text-coral">♥</span> using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
