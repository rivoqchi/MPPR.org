import { DownloadOutlined, PauseOutlined, CaretRightFilled } from '@ant-design/icons'
import { theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { formatVoiceDuration } from '@/features/chat/lib/chat-attachments'
import { generateVoiceWaveform } from '@/features/chat/lib/voice-waveform'

const PLAYBACK_RATES = [1, 1.5, 2] as const

let activeVoiceAudio: HTMLAudioElement | null = null

interface VoiceMessagePlayerProps {
  src: string
  durationSec?: number
  isOwn?: boolean
  seed: string
  variant?: 'message' | 'media'
  createdAt?: string
  downloadHref?: string
}

export function VoiceMessagePlayer({
  src,
  durationSec,
  isOwn = false,
  seed,
  variant = 'message',
  createdAt,
  downloadHref,
}: VoiceMessagePlayerProps) {
  const { token } = theme.useToken()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(durationSec ?? 0)
  const [playbackRateIndex, setPlaybackRateIndex] = useState(0)

  const isMediaVariant = variant === 'media'
  const waveform = useMemo(() => generateVoiceWaveform(seed, isMediaVariant ? 48 : 42), [isMediaVariant, seed])
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0

  const accentColor = isMediaVariant ? token.colorPrimary : isOwn ? '#fff' : token.colorPrimary
  const barInactive = isMediaVariant
    ? `${token.colorPrimary}33`
    : isOwn
      ? 'rgba(255,255,255,0.35)'
      : `${token.colorPrimary}40`
  const timeColor = isMediaVariant ? token.colorTextSecondary : isOwn ? 'rgba(255,255,255,0.85)' : token.colorTextSecondary
  const playButtonBackground = isMediaVariant ? token.colorPrimary : isOwn ? '#fff' : token.colorPrimary
  const playIconColor = isMediaVariant ? '#fff' : isOwn ? token.colorPrimary : '#fff'
  const playButtonSize = isMediaVariant ? 42 : 48

  useEffect(() => {
    const audio = new Audio(src)
    audio.preload = 'metadata'
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration))
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (activeVoiceAudio === audio) {
        activeVoiceAudio = null
      }
    }

    const handlePause = () => {
      if (audio.paused) {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('pause', handlePause)

    return () => {
      if (activeVoiceAudio === audio) {
        activeVoiceAudio = null
      }

      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('pause', handlePause)
      audioRef.current = null
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.playbackRate = PLAYBACK_RATES[playbackRateIndex]
  }, [playbackRateIndex])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    if (activeVoiceAudio && activeVoiceAudio !== audio) {
      activeVoiceAudio.pause()
      activeVoiceAudio.currentTime = 0
    }

    activeVoiceAudio = audio

    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }

  const seekToProgress = (nextProgress: number) => {
    const audio = audioRef.current
    if (!audio || duration <= 0) {
      return
    }

    const clamped = Math.min(1, Math.max(0, nextProgress))
    audio.currentTime = clamped * duration
    setCurrentTime(audio.currentTime)
  }

  const handleWaveformClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const nextProgress = (event.clientX - rect.left) / rect.width
    seekToProgress(nextProgress)
  }

  const cyclePlaybackRate = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setPlaybackRateIndex((index) => (index + 1) % PLAYBACK_RATES.length)
  }

  const displayedTime = isPlaying ? currentTime : duration

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: isMediaVariant ? 12 : 10,
        width: isMediaVariant ? '100%' : undefined,
        minWidth: isMediaVariant ? undefined : 220,
        maxWidth: isMediaVariant ? 'none' : 300,
        marginBottom: isMediaVariant ? 0 : 6,
        padding: isMediaVariant ? '12px 14px' : undefined,
        borderRadius: isMediaVariant ? 14 : undefined,
        background: isMediaVariant ? token.colorFillQuaternary : undefined,
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
          style={{
            width: playButtonSize,
            height: playButtonSize,
            borderRadius: '50%',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            background: playButtonBackground,
            boxShadow: isOwn && !isMediaVariant ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPlaying ? (
            <PauseOutlined style={{ fontSize: isMediaVariant ? 18 : 20, color: playIconColor }} />
          ) : (
            <CaretRightFilled
              style={{ fontSize: isMediaVariant ? 20 : 22, color: playIconColor, marginLeft: 3 }}
            />
          )}
        </button>

        {!isPlaying ? (
          <button
            type="button"
            onClick={cyclePlaybackRate}
            aria-label="Change playback speed"
            style={{
              position: 'absolute',
              right: -4,
              bottom: -2,
              minWidth: 24,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              border: 'none',
              background: isMediaVariant
                ? token.colorBgContainer
                : isOwn
                  ? 'rgba(255,255,255,0.95)'
                  : token.colorPrimaryBg,
              color: token.colorPrimary,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              cursor: 'pointer',
            }}
          >
            {PLAYBACK_RATES[playbackRateIndex]}×
          </button>
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onClick={handleWaveformClick}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              seekToProgress(progress + 0.05)
            }

            if (event.key === 'ArrowLeft') {
              seekToProgress(progress - 0.05)
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: isMediaVariant ? 36 : 32,
            cursor: 'pointer',
          }}
        >
          {waveform.map((height, index) => {
            const barProgress = (index + 1) / waveform.length
            const isActive = barProgress <= progress

            return (
              <span
                key={`${seed}-${index}`}
                style={{
                  flex: 1,
                  minWidth: 2,
                  maxWidth: isMediaVariant ? 5 : 4,
                  height: `${Math.round(height * 100)}%`,
                  borderRadius: 2,
                  background: isActive ? accentColor : barInactive,
                  transition: 'background 0.12s ease',
                }}
              />
            )
          })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              lineHeight: 1,
              color: timeColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatVoiceDuration(displayedTime)}
          </span>

          {isMediaVariant && createdAt ? (
            <span style={{ fontSize: 11, color: token.colorTextQuaternary }}>
              {dayjs(createdAt).format('DD.MM.YYYY HH:mm')}
            </span>
          ) : null}
        </div>
      </div>

      {isMediaVariant && downloadHref ? (
        <a
          href={downloadHref}
          download
          aria-label="Download voice message"
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: token.colorPrimary,
            background: token.colorBgContainer,
          }}
        >
          <DownloadOutlined />
        </a>
      ) : null}
    </div>
  )
}
