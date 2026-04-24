import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserMode } from '../../context/UserModeContext';
import { useProgress } from '../../context/supabase/ProgressContext';
import mediaData from '../../data/mediaLibrary.json';

interface Video {
  id: string;
  youtube_id: string;
  title: string;
  channel: string;
  math_concept: string;
  target_level: string;
  description: string;
  color: string;
  tags: string[];
}

const ALL_VIDEOS: Video[] = mediaData.videos;

function YoutubeThumbnail({ youtubeId, title, color }: {
  youtubeId: string; title: string; color: string;
}) {
  return (
    <div
      className="relative w-full aspect-video rounded-lg overflow-hidden"
      style={{ border: `2px solid ${color}40` }}
    >
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
        alt={title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: color }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white ml-1">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ video, onClose, isDaw }: {
  video: Video; onClose: () => void; isDaw: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={`w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl ${
          isDaw ? 'bg-daw-surface border border-daw-border' : 'bg-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-start justify-between gap-3"
          style={{ backgroundColor: `${video.color}18`, borderBottom: `1px solid ${video.color}30` }}
        >
          <div>
            <h3 className={`font-bold text-sm leading-snug ${isDaw ? 'text-daw-text' : 'text-lab-text'}`}>
              {video.title}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: video.color }}>
              {video.channel} · {video.math_concept}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              isDaw ? 'bg-daw-s2 text-daw-muted hover:text-daw-text' : 'bg-gray-100 text-gray-500 hover:text-gray-800'
            }`}
            aria-label="Cerrar video"
          >
            ✕
          </button>
        </div>

        {/* YouTube iframe */}
        <div className="w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Description */}
        <div className={`px-4 py-3 ${isDaw ? 'bg-daw-s2' : 'bg-slate-50'}`}>
          <p className={`text-sm ${isDaw ? 'text-daw-muted' : 'text-lab-muted'}`}>
            {video.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {video.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${video.color}20`, color: video.color }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MediaLibrary() {
  const { mode } = useUserMode();
  const { trackEvent } = useProgress();
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const isDaw = mode === 'C';

  const targetLevel = isDaw ? '2_medio' : '5_basico';
  const filtered = filter === 'all'
    ? ALL_VIDEOS.filter(v => v.target_level === targetLevel)
    : ALL_VIDEOS.filter(v => v.target_level === targetLevel && v.tags.includes(filter));

  const handleOpen = (video: Video) => {
    setActiveVideo(video);
    trackEvent('VisualizerScreen', 'video_opened', {
      video_id: video.id,
      youtube_id: video.youtube_id,
      math_concept: video.math_concept,
    });
  };

  const filterTags = isDaw
    ? ['all', 'potencias', 'álgebra', 'ondas', 'física']
    : ['all', 'multiplicación', 'fracciones', 'ritmo', 'animación'];

  return (
    <>
      {/* ── Player modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeVideo && (
          <VideoPlayer
            video={activeVideo}
            onClose={() => setActiveVideo(null)}
            isDaw={isDaw}
          />
        )}
      </AnimatePresence>

      {/* ── Component card ──────────────────────────────────────────────────── */}
      <div
        className={`rounded-xl overflow-hidden border ${
          isDaw
            ? 'bg-daw-surface border-daw-border'
            : 'bg-lab-card border-lab-border shadow-sm'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${
            isDaw ? 'border-daw-border' : 'border-lab-border'
          }`}
        >
          <div>
            <h2 className={`font-semibold text-sm tracking-wide ${isDaw ? 'text-daw-text font-mono' : 'text-lab-text'}`}>
              {isDaw ? 'MEDIA LIBRARY — MATH × MUSIC' : '🎬 Videos de Matemáticas y Música'}
            </h2>
            <p className={`text-xs mt-0.5 ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
              {isDaw
                ? `${filtered.length} videos curados — nivel 2° Medio`
                : `${filtered.length} videos para explorar — nivel 5° Básico`}
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {filterTags.map(tag => (
              <motion.button
                key={tag}
                whileTap={{ scale: 0.92 }}
                onClick={() => setFilter(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === tag
                    ? isDaw
                      ? 'bg-daw-accent text-daw-bg'
                      : 'bg-lab-accent text-white'
                    : isDaw
                    ? 'bg-daw-s2 text-daw-muted hover:text-daw-text'
                    : 'bg-lab-border text-lab-muted hover:text-lab-text'
                }`}
              >
                {tag === 'all' ? (isDaw ? 'Todos' : 'Todos') : `#${tag}`}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Video grid */}
        <div className={`p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${isDaw ? 'bg-daw-bg' : 'bg-slate-50/40'}`}>
          {filtered.length > 0 ? filtered.map(video => (
            <motion.button
              key={video.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleOpen(video)}
              className={`text-left rounded-xl overflow-hidden border transition-shadow hover:shadow-md ${
                isDaw ? 'bg-daw-surface border-daw-border' : 'bg-white border-lab-border'
              }`}
            >
              <YoutubeThumbnail
                youtubeId={video.youtube_id}
                title={video.title}
                color={video.color}
              />
              <div className="p-2.5">
                <p
                  className={`text-xs font-semibold leading-snug line-clamp-2 ${
                    isDaw ? 'text-daw-text' : 'text-lab-text'
                  }`}
                >
                  {video.title}
                </p>
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: video.color }}
                >
                  {video.math_concept}
                </p>
              </div>
            </motion.button>
          )) : (
            <div className={`col-span-full text-center py-8 text-sm ${isDaw ? 'text-daw-muted font-mono' : 'text-lab-muted'}`}>
              No hay videos con ese filtro.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
