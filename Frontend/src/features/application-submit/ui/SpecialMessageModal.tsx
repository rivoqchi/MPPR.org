import { App, Button, Input, Modal, Space, theme, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicationSpecialMessage } from '@/entities/application/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'

const { Text } = Typography

const PROMPT_WIDTH = 420
const FORM_WIDTH = 480

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
    <Modal
      title={t('applicationSubmit.specialMessage.title')}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      centered
      width={isFormStep ? FORM_WIDTH : PROMPT_WIDTH}
      zIndex={1100}
      footer={
        isFormStep ? (
          <Space>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleConfirmMessages}>
              {t('applicationSubmit.send')}
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={onSkip}>{t('common.no')}</Button>
            <Button type="primary" onClick={() => setWantsSpecialMessage(true)}>
              {t('common.yes')}
            </Button>
          </Space>
        )
      }
      styles={{
        body: {
          maxHeight: isFormStep ? 'min(48vh, 320px)' : undefined,
          overflowY: isFormStep ? 'auto' : undefined,
        },
      }}
    >
      {wantsSpecialMessage === null ? (
        <Text>{t('applicationSubmit.specialMessage.prompt')}</Text>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">{t('applicationSubmit.specialMessage.hint')}</Text>

          {selectedUnits.map((unit) => (
            <div
              key={unit.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
              }}
            >
              <label
                htmlFor={`special-message-${unit.id}`}
                style={{
                  flexShrink: 0,
                  minWidth: 72,
                  paddingTop: 10,
                  fontWeight: 500,
                  color: token.colorText,
                }}
              >
                {unit.shortName}:
              </label>
              <Input.TextArea
                id={`special-message-${unit.id}`}
                rows={2}
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
    </Modal>
  )
}
