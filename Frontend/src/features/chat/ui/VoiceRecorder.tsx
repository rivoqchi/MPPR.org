import { AudioOutlined } from '@ant-design/icons'
import { Button, theme } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatVoiceDuration } from '@/features/chat/lib/chat-attachments'

interface VoiceRecorderProps {
  disabled?: boolean
  onRecorded: (blob: Blob, durationSec: number) => void
}

export function VoiceRecorder({ disabled, onRecorded }: VoiceRecorderProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }

      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = async () => {
    if (disabled || recording) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : ''
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        onRecorded(blob, durationSec)
        setRecording(false)
        setElapsed(0)
        stopTimer()
      }

      mediaRecorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.start()
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000))
      }, 250)
    } catch {
      setRecording(false)
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current

    if (!recorder || recorder.state === 'inactive') {
      return
    }

    recorder.stop()
  }

  return (
    <Button
      type={recording ? 'primary' : 'default'}
      danger={recording}
      icon={<AudioOutlined />}
      disabled={disabled && !recording}
      onMouseDown={() => void startRecording()}
      onMouseUp={stopRecording}
      onMouseLeave={() => {
        if (recording) {
          stopRecording()
        }
      }}
      onTouchStart={(event) => {
        event.preventDefault()
        void startRecording()
      }}
      onTouchEnd={(event) => {
        event.preventDefault()
        stopRecording()
      }}
      title={recording ? t('chat.recording') : t('chat.holdToRecord')}
      style={recording ? { background: token.colorError, borderColor: token.colorError } : undefined}
    >
      {recording ? formatVoiceDuration(elapsed) : null}
    </Button>
  )
}
