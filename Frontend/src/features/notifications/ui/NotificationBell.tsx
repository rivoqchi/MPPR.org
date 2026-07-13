import { CheckOutlined, BellOutlined } from '@ant-design/icons'
import {
  Badge,
  Button,
  Empty,
  List,
  Pagination,
  Popover,
  Space,
  Spin,
  Typography,
  theme,
} from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatNotificationTime } from '@/entities/notification/lib/notification-display'
import { useNotificationsStore } from '@/entities/notification/model/notifications-store'
import type { Notification } from '@/entities/notification/model/types'

const BELL_PAGE_SIZE = 100

export function NotificationBell() {
  const { token } = theme.useToken()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const items = useNotificationsStore((state) => state.items)
  const meta = useNotificationsStore((state) => state.meta)
  const unreadCount = useNotificationsStore((state) => state.unreadCount)
  const isLoading = useNotificationsStore((state) => state.isLoading)
  const loadNotifications = useNotificationsStore((state) => state.loadNotifications)
  const loadUnreadCount = useNotificationsStore((state) => state.loadUnreadCount)
  const markRead = useNotificationsStore((state) => state.markRead)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)

  useEffect(() => {
    void loadUnreadCount()
  }, [loadUnreadCount])

  useEffect(() => {
    if (open) {
      void loadNotifications(1, BELL_PAGE_SIZE)
    }
  }, [loadNotifications, open])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markRead(notification.id)
    }

    setOpen(false)

    if (notification.linkPath) {
      navigate(notification.linkPath)
    }
  }

  const content = (
    <div style={{ width: 400, maxWidth: '90vw' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Typography.Text strong>{t('notifications.title')}</Typography.Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => void markAllRead()}
          >
            {t('notifications.markAll')}
          </Button>
        )}
      </div>

      <Spin spinning={isLoading}>
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('notifications.empty')} />
        ) : (
          <List
            size="small"
            dataSource={items}
            style={{ maxHeight: 420, overflowY: 'auto' }}
            renderItem={(item) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  paddingInline: 8,
                  borderRadius: token.borderRadius,
                  background: item.read ? 'transparent' : token.colorPrimaryBg,
                }}
                onClick={() => void handleNotificationClick(item)}
              >
                <List.Item.Meta
                  title={
                    <Typography.Text strong={!item.read}>{item.title}</Typography.Text>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Typography.Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ marginBottom: 0, color: token.colorTextSecondary }}
                      >
                        {item.message}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatNotificationTime(item.createdAt)}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>

      {meta.total > 0 && (
        <Pagination
          size="small"
          style={{ marginTop: 12, textAlign: 'center' }}
          current={meta.page}
          pageSize={BELL_PAGE_SIZE}
          total={meta.total}
          showSizeChanger={false}
          onChange={(page) => {
            void loadNotifications(page, BELL_PAGE_SIZE)
          }}
        />
      )}
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  )
}
