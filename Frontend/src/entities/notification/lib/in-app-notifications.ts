import {
  BellOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import type { NotificationInstance } from 'antd/es/notification/interface'
import { createElement } from 'react'
import { appRouter } from '@/app/router'
import type { Notification } from '@/entities/notification/model/types'
import { NOTIFICATION_CONFIG } from '@/shared/lib/constants'

let notificationApi: NotificationInstance | null = null

export function registerInAppNotificationApi(api: NotificationInstance | null): void {
  notificationApi = api
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'application_created':
      return createElement(FileTextOutlined, { style: { color: '#1677ff' } })
    case 'application_workflow_message':
      return createElement(BellOutlined, { style: { color: '#1677ff' } })
    case 'application_workflow_status':
      return createElement(CheckCircleOutlined, { style: { color: '#52c41a' } })
    default:
      return createElement(InfoCircleOutlined, { style: { color: '#1677ff' } })
  }
}

function navigateToNotification(linkPath?: string | null): void {
  if (!linkPath) {
    return
  }

  void appRouter.navigate(linkPath)
}

export function showInAppNotification(notification: Notification): void {
  if (!notificationApi) {
    return
  }

  notificationApi.open({
    key: notification.id,
    message: notification.title,
    description: notification.message,
    placement: NOTIFICATION_CONFIG.placement,
    duration: NOTIFICATION_CONFIG.duration,
    icon: getNotificationIcon(notification.type),
    onClick: () => {
      notificationApi?.destroy(notification.id)
      navigateToNotification(notification.linkPath)
    },
    style: notification.linkPath
      ? {
          cursor: 'pointer',
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
        }
      : {
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
        },
  })
}
