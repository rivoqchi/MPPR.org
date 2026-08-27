import { FileOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Input, Pagination, Select, Space, Tag, theme } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '@/entities/application/model/types'
import { useStructuralUnitsStore } from '@/entities/structural-unit/model/structural-units-store'
import { getUserFullName } from '@/entities/user/lib/user-display'
import { useUsersStore } from '@/entities/user/model/users-store'
import { getApplicationTypeFilterOptions } from '@/features/application-submit/lib/filter-applications'
import { getApplicationStatusTagColor, hasApplicationWorkflow } from '@/features/application-submit/lib/application-status'
import { getWorkflowStatusTagColor } from '@/features/application-workflow/lib/workflow-access'
import { getSplitPanelListShellStyle } from '@/shared/lib/page-layout'

const APPLICATION_LIST_PAGE_SIZE = 10

interface ApplicationChatListProps {
  applications: Application[]
  selectedApplicationId?: string
  onSelect: (applicationId: string) => void
  onSend?: () => void
  listTitleKey?: string
  emptyListKey?: string
  emptySearchKey?: string
}

export function ApplicationChatList({
  applications,
  selectedApplicationId,
  onSelect,
  onSend,
  listTitleKey = 'applicationSubmit.listTitle',
  emptyListKey = 'applicationSubmit.emptyList',
  emptySearchKey = 'applicationSubmit.emptySearch',
}: ApplicationChatListProps) {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const structuralUnits = useStructuralUnitsStore((state) => state.structuralUnits)
  const users = useUsersStore((state) => state.users)
  const [searchValue, setSearchValue] = useState('')
  const [typeFilter, setTypeFilter] = useState<Application['type']>()
  const [page, setPage] = useState(1)

  const filteredApplications = useMemo(() => {
    const search = searchValue.trim().toLowerCase()

    return applications.filter((application) => {
      if (typeFilter && application.type !== typeFilter) {
        return false
      }

      if (!search) {
        return true
      }

      return application.comment.toLowerCase().includes(search)
    })
  }, [applications, searchValue, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [searchValue, typeFilter])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredApplications.length / APPLICATION_LIST_PAGE_SIZE))

    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [filteredApplications.length, page])

  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * APPLICATION_LIST_PAGE_SIZE

    return filteredApplications.slice(start, start + APPLICATION_LIST_PAGE_SIZE)
  }, [filteredApplications, page])

  const getUnitLabel = (unitId: string) => {
    const unit = structuralUnits.find((item) => item.id === unitId)

    return unit ? unit.shortName : unitId
  }

  const getApplicationTargetLabel = (application: Application) => {
    const recipientIds = application.recipientUserIds ?? []

    if (recipientIds.length > 0) {
      return recipientIds
        .map((userId) => {
          const user = users.find((item) => item.id === userId)

          return user ? getUserFullName(user) : userId
        })
        .join(', ')
    }

    const unitPart = application.structuralUnitIds.map(getUnitLabel).join(', ')

    if (application.submissionMode !== 'single' || !application.structuralUnitSectionId) {
      return unitPart
    }

    const unit = structuralUnits.find((item) => item.id === application.structuralUnitIds[0])
    const section = unit?.sections.find(
      (item) => item.id === application.structuralUnitSectionId,
    )
    const sectionLabel = section
      ? section.shortName || section.originalName
      : application.structuralUnitSectionId

    return `${unitPart} · ${sectionLabel}`
  }

  return (
    <div
      style={{
        width: 360,
        minWidth: 360,
        flexShrink: 0,
        ...getSplitPanelListShellStyle(token),
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 600 }}>{t(listTitleKey)}</span>
        {onSend && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onSend}>
            {t('applicationSubmit.send')}
          </Button>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Input.Search
          allowClear
          placeholder={t('applicationSubmit.filters.search')}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onSearch={setSearchValue}
        />
        <Select
          allowClear
          placeholder={t('applicationSubmit.filters.type')}
          value={typeFilter}
          onChange={setTypeFilter}
          options={getApplicationTypeFilterOptions().map((option) => ({
            value: option.value,
            label: t(option.labelKey),
          }))}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          padding: '8px 12px',
        }}
      >
        {applications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t(emptyListKey)}
            style={{ marginTop: 48 }}
          />
        ) : filteredApplications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t(emptySearchKey)}
            style={{ marginTop: 48 }}
          />
        ) : (
          paginatedApplications.map((application) => {
            const isSelected = application.id === selectedApplicationId

            return (
              <button
                key={application.id}
                type="button"
                onClick={() => onSelect(application.id)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: token.borderRadiusLG,
                  background: isSelected ? token.colorPrimaryBg : 'transparent',
                  boxShadow: isSelected ? `inset 3px 0 0 ${token.colorPrimary}` : undefined,
                  padding: '12px 14px',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FileOutlined style={{ fontSize: 20, marginTop: 2, flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Space size={4} wrap>
                      <Tag
                        color={
                          hasApplicationWorkflow(application)
                            ? getWorkflowStatusTagColor(application.workflowStatus)
                            : getApplicationStatusTagColor(application.status)
                        }
                        style={{ margin: 0 }}
                      >
                        {hasApplicationWorkflow(application)
                          ? t(`applicationWorkflow.status.${application.workflowStatus}`)
                          : t(`applicationSubmit.status.${application.status}`)}
                      </Tag>
                    </Space>
                    <span style={{ fontSize: 12, color: token.colorTextSecondary, flexShrink: 0 }}>
                      {dayjs(application.createdAt).format('DD.MM.YY')}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: token.colorTextSecondary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {application.applicationNumber
                      ? `№ ${application.applicationNumber} · ${getApplicationTargetLabel(application)}`
                      : getApplicationTargetLabel(application)}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color: token.colorText,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {application.comment}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {filteredApplications.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Pagination
            current={page}
            pageSize={APPLICATION_LIST_PAGE_SIZE}
            total={filteredApplications.length}
            showSizeChanger={false}
            onChange={setPage}
            size="small"
          />
        </div>
      )}
    </div>
  )
}
