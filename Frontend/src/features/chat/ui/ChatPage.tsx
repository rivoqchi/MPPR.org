import { Empty, theme } from 'antd'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useChatStore } from '@/entities/chat/model/chat-store'
import { ChatSidebarPanel } from '@/features/chat/ui/ChatSidebarPanel'
import { ChatThread } from '@/features/chat/ui/ChatThread'
import { RequirePageView } from '@/shared/ui/RequirePageView'
import { useLayoutBreakpoint } from '@/shared/hooks/useLayoutBreakpoint'

const PAGE_KEY = '/chat'

export function ChatPage() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { isMobileOrTablet } = useLayoutBreakpoint()
  const refreshConversations = useChatStore((state) => state.refreshConversations)

  useEffect(() => {
    if (conversationId) {
      void refreshConversations()
    }
  }, [conversationId, refreshConversations])

  return (
    <RequirePageView pageKey={PAGE_KEY}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {conversationId ? (
          <ChatThread conversationId={conversationId} />
        ) : isMobileOrTablet ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              background: token.colorBgContainer,
              borderRadius: 12,
              overflow: 'hidden',
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <ChatSidebarPanel />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              background: token.colorBgContainer,
              borderRadius: 12,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Empty description={t('chat.selectConversation')} />
          </div>
        )}
      </div>
    </RequirePageView>
  )
}
