import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Button, Descriptions, Empty, Popconfirm, Space, Tag, theme } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/entities/user/model/auth-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import { filterSectionsForUserAccess } from '@/entities/user/lib/section-access'
import { useUsersStore } from '@/entities/user/model/users-store'
import { useStructuralUnitScope } from '@/shared/hooks/useStructuralUnitScope'
import type {
  StructuralUnit,
  StructuralUnitDocument,
  StructuralUnitSection,
} from '@/entities/structural-unit/model/types'
import {
  StructuralUnitDocumentList,
  StructuralUnitSectionCard,
} from '@/features/structural-unit/ui/StructuralUnitSectionCard'
import {
  canOpenDocumentPreview,
  StructuralUnitDocumentModal,
} from '@/features/structural-unit/ui/StructuralUnitDocumentModal'
import {
  getSplitDetailPanelCardStyle,
  splitDetailPanelScrollStyle,
  splitPanelScrollStyle,
  splitPanelShellStyle,
} from '@/shared/lib/page-layout'

interface StructuralUnitDetailProps {
  structuralUnit?: StructuralUnit
  onEdit?: () => void
  onDelete?: () => void
  canManageSections?: boolean
  onAddSection?: () => void
  onEditSection?: (section: StructuralUnitSection) => void
}

export function StructuralUnitDetail({
  structuralUnit,
  onEdit,
  onDelete,
  canManageSections,
  onAddSection,
  onEditSection,
}: StructuralUnitDetailProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const { notification } = App.useApp()
  const currentUser = useAuthStore((state) => state.currentUser)
  const users = useUsersStore((state) => state.users)
  const { canViewAll } = useStructuralUnitScope()
  const [previewDocument, setPreviewDocument] = useState<StructuralUnitDocument | null>(null)

  const handlePreview = (document: StructuralUnitDocument) => {
    if (!canOpenDocumentPreview(document)) {
      notification.error({
        message: t('structuralUnit.documents.previewUnavailable'),
      })
      return
    }

    setPreviewDocument(document)
  }

  const headLabel = useMemo(() => {
    if (!structuralUnit) {
      return '—'
    }

    if (structuralUnit.headUserId) {
      const headUser = users.find((user) => user.id === structuralUnit.headUserId)

      if (headUser) {
        return getUserFullName(headUser)
      }
    }

    return structuralUnit.headFullName?.trim() || '—'
  }, [structuralUnit, users])

  const resolveSectionHeadLabel = (section: StructuralUnitSection) => {
    if (section.headUserId) {
      const headUser = users.find((user) => user.id === section.headUserId)

      if (headUser) {
        return getUserFullName(headUser)
      }
    }

    return section.headFullName?.trim() || undefined
  }

  const sections = useMemo(
    () =>
      structuralUnit
        ? filterSectionsForUserAccess(
            structuralUnit.sections ?? [],
            currentUser,
            structuralUnit.id,
            canViewAll || Boolean(canManageSections),
          )
        : [],
    [canManageSections, canViewAll, currentUser, structuralUnit],
  )

  if (!structuralUnit) {
    return (
      <div
        style={{
          ...splitPanelShellStyle,
          background: token.colorBgLayout,
        }}
      >
        <div
          style={{
            ...splitPanelScrollStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty description={t('structuralUnit.selectItem')} />
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          ...splitPanelShellStyle,
          background: token.colorBgLayout,
        }}
      >
        <div style={splitDetailPanelScrollStyle}>
          <div style={getSplitDetailPanelCardStyle(token)}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{structuralUnit.originalName}</div>
                <Tag color="blue" style={{ marginTop: 8 }}>
                  {structuralUnit.shortName}
                </Tag>
              </div>

              {(onEdit || onDelete) && (
                <Space>
                  {onEdit && (
                    <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                      {t('structuralUnit.edit')}
                    </Button>
                  )}
                  {onDelete && (
                    <Popconfirm
                      title={t('structuralUnit.deleteConfirm')}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
                      onConfirm={onDelete}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        {t('structuralUnit.delete')}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              )}
            </div>

            <Descriptions
              column={1}
              bordered
              items={[
                {
                  key: 'originalName',
                  label: t('structuralUnit.fields.originalName'),
                  children: structuralUnit.originalName,
                },
                {
                  key: 'shortName',
                  label: t('structuralUnit.fields.shortName'),
                  children: structuralUnit.shortName,
                },
                {
                  key: 'headUser',
                  label: t('structuralUnit.fields.headUser'),
                  children: headLabel,
                },
              ]}
            />

            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>
                {t('structuralUnit.fields.documents')} ({structuralUnit.documents.length})
              </div>

              <StructuralUnitDocumentList
                documents={structuralUnit.documents}
                onPreview={handlePreview}
              />
            </div>

            <div style={{ marginTop: 32 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {t('structuralUnit.section.title')} ({sections.length})
                </div>

                {canManageSections && onAddSection && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={onAddSection}>
                    {t('structuralUnit.section.add')}
                  </Button>
                )}
              </div>

              {sections.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('structuralUnit.section.empty')}
                />
              ) : (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  {sections.map((section) => (
                    <StructuralUnitSectionCard
                      key={section.id}
                      originalName={section.originalName}
                      shortName={section.shortName}
                      headFullName={resolveSectionHeadLabel(section)}
                      documents={section.documents}
                      onEdit={
                        canManageSections && onEditSection
                          ? () => onEditSection(section)
                          : undefined
                      }
                      onPreview={handlePreview}
                    />
                  ))}
                </Space>
              )}
            </div>
          </div>
        </div>
      </div>

      <StructuralUnitDocumentModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </>
  )
}
