import { Button, Descriptions, Modal, Tag } from 'antd'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Application } from '@/entities/application/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import { useUsersStore } from '@/entities/user/model/users-store'
import { getApplicationStatusTagColor } from '@/features/application-submit/lib/application-status'

interface ApplicationCalendarEventModalProps {
  open: boolean
  application: Application | null
  onClose: () => void
}

export function ApplicationCalendarEventModal({
  open,
  application,
  onClose,
}: ApplicationCalendarEventModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)

  const submitterName = useMemo(() => {
    if (!application) {
      return '—'
    }

    if (application.createdByFirstName && application.createdByLastName) {
      return getUserFullName({
        firstName: application.createdByFirstName,
        lastName: application.createdByLastName,
      })
    }

    const user = users.find((item) => item.id === application.createdByUserId)

    return user ? getUserFullName(user) : '—'
  }, [application, users])

  const unitLabels = useMemo(() => {
    if (!application) {
      return '—'
    }

    return (
      application.structuralUnitIds
        .map((unitId) => structuralUnits.find((item) => item.id === unitId)?.shortName ?? unitId)
        .join(', ') || '—'
    )
  }, [application, structuralUnits])

  const handleViewDetails = () => {
    if (!application) {
      return
    }

    navigate(`/applications/submit?applicationId=${application.id}`)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('applicationCalendar.modal.title')}
      onCancel={onClose}
      width={720}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="details" type="primary" disabled={!application} onClick={handleViewDetails}>
          {t('applicationCalendar.modal.viewDetails')}
        </Button>,
      ]}
    >
      {application && (
        <>
          <div style={{ marginBottom: 16 }}>
            <Tag color="orange">{t(`applicationSubmit.types.${application.type}`)}</Tag>
            <Tag color={getApplicationStatusTagColor(application.status)}>
              {t(`applicationSubmit.status.${application.status}`)}
            </Tag>
          </div>

          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              {
                key: 'submitter',
                label: t('applicationSubmit.fields.submittedBy'),
                children: submitterName,
              },
              {
                key: 'units',
                label: t('applicationSubmit.fields.structuralUnits'),
                children: unitLabels,
              },
              {
                key: 'deadline',
                label: t('applicationSubmit.fields.deadline'),
                children: application.deadline
                  ? dayjs(application.deadline).format('DD.MM.YYYY')
                  : '—',
              },
              {
                key: 'createdAt',
                label: t('applicationCalendar.modal.createdAt'),
                children: dayjs(application.createdAt).format('DD.MM.YYYY HH:mm'),
              },
              {
                key: 'attachments',
                label: t('applicationCalendar.modal.attachments'),
                children: t('applicationCalendar.modal.attachmentsValue', {
                  images: application.images.length,
                  files: application.files.length,
                }),
              },
              {
                key: 'comment',
                label: t('applicationSubmit.fields.comment'),
                children: application.comment,
              },
            ]}
          />
        </>
      )}
    </Modal>
  )
}
