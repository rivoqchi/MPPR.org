import { App, Button, Drawer, Input, Space, theme } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicationSpecialMessage } from '@/entities/application/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'

interface SpecialMessageModalProps {
  open: boolean
  structuralUnitIds: string[]
  onCancel: () => void
  onSkip: () => void
  onConfirm: (messages: ApplicationSpecialMessage[]) => void
}

export function SpecialMessageModal({
  open,
  structuralUnitIds,
  onCancel,
  onSkip,
  onConfirm,
}: SpecialMessageModalProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { notification } = App.useApp()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const [wantsSpecialMessage, setWantsSpecialMessage] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})

  const selectedUnits = useMemo(
    () =>
      structuralUnits.filter((unit) => structuralUnitIds.includes(unit.id)),
    [structuralUnitIds, structuralUnits],
  )

  useEffect(() => {
    if (!open) {
      setWantsSpecialMessage(null)
      setMessages({})
    }
  }, [open])

  const handleConfirmMessages = () => {
    const filled = selectedUnits
      .map((unit) => ({
        structuralUnitId: unit.id,
        message: messages[unit.id]?.trim() ?? '',
      }))
      .filter((item) => item.message.length > 0)

    if (filled.length === 0) {
      notification.error({
        message: t('applicationSubmit.specialMessage.atLeastOne'),
      })
      return
    }

    onConfirm(filled)
  }

  const isFormStep = wantsSpecialMessage === true

  return (
    <Drawer
      title={t('applicationSubmit.specialMessage.title')}
      placement="top"
      open={open}
      onClose={onCancel}
      destroyOnHidden
      height={isFormStep ? 'min(72vh, 640px)' : 200}
      footer={
        isFormStep ? (
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleConfirmMessages}>
              {t('applicationSubmit.send')}
            </Button>
          </Space>
        ) : null
      }
      styles={{
        body: {
          overflowY: isFormStep ? 'auto' : 'visible',
        },
      }}
    >
      {wantsSpecialMessage === null ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ fontSize: 16 }}>{t('applicationSubmit.specialMessage.prompt')}</div>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onSkip}>{t('common.no')}</Button>
            <Button type="primary" onClick={() => setWantsSpecialMessage(true)}>
              {t('common.yes')}
            </Button>
          </Space>
        </Space>
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ color: 'inherit', opacity: 0.75 }}>
            {t('applicationSubmit.specialMessage.hint')}
          </div>

          {selectedUnits.map((unit) => (
            <div
              key={unit.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                width: '100%',
              }}
            >
              <label
                htmlFor={`special-message-${unit.id}`}
                style={{
                  flexShrink: 0,
                  minWidth: 88,
                  paddingTop: 10,
                  fontWeight: 500,
                  color: token.colorText,
                }}
              >
                {unit.shortName}:
              </label>
              <Input.TextArea
                id={`special-message-${unit.id}`}
                rows={3}
                style={{ flex: 1 }}
                value={messages[unit.id] ?? ''}
                onChange={(event) =>
                  setMessages((previous) => ({
                    ...previous,
                    [unit.id]: event.target.value,
                  }))
                }
                placeholder={t('applicationSubmit.specialMessage.placeholder')}
              />
            </div>
          ))}
        </Space>
      )}
    </Drawer>
  )
}
