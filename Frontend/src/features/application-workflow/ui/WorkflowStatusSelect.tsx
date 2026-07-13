import { Select } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicationAttachment, ApplicationWorkflowStatus } from '@/entities/application/model/types'
import { WORKFLOW_UNIT_STATUSES } from '@/features/application-workflow/lib/workflow-access'
import { ConfirmationFilesModal } from '@/features/application-workflow/ui/ConfirmationFilesModal'

interface WorkflowStatusSelectProps {
  status: ApplicationWorkflowStatus
  confirmationFiles: ApplicationAttachment[]
  onStatusChange: (
    status: ApplicationWorkflowStatus,
    confirmationFiles?: ApplicationAttachment[],
  ) => Promise<void>
  loading?: boolean
}

export function WorkflowStatusSelect({
  status,
  confirmationFiles,
  onStatusChange,
  loading = false,
}: WorkflowStatusSelectProps) {
  const { t } = useTranslation()
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ApplicationWorkflowStatus | null>(null)

  const options = useMemo(
    () =>
      WORKFLOW_UNIT_STATUSES.map((item) => ({
        value: item,
        label: t(`applicationWorkflow.status.${item}`),
      })),
    [t],
  )

  const handleChange = (nextStatus: ApplicationWorkflowStatus) => {
    if (nextStatus === status) {
      return
    }

    if (nextStatus === 'pending_confirmation') {
      setPendingStatus(nextStatus)
      setConfirmationModalOpen(true)
      return
    }

    void onStatusChange(nextStatus)
  }

  return (
    <>
      <Select
        value={status}
        options={options}
        loading={loading}
        style={{ minWidth: 180, flexShrink: 0 }}
        onChange={handleChange}
        aria-label={t('applicationWorkflow.statusLabel')}
      />

      <ConfirmationFilesModal
        open={confirmationModalOpen}
        existingFiles={confirmationFiles}
        onCancel={() => {
          setConfirmationModalOpen(false)
          setPendingStatus(null)
        }}
        onConfirm={async (files) => {
          if (pendingStatus) {
            await onStatusChange(pendingStatus, files)
          }

          setConfirmationModalOpen(false)
          setPendingStatus(null)
        }}
      />
    </>
  )
}
