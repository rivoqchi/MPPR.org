import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  FileTextOutlined,
  ItalicOutlined,
  LineOutlined,
  OrderedListOutlined,
  PictureOutlined,
  QrcodeOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import { Button, Divider, Select, Space, Tooltip, theme } from 'antd'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DocumentTiptapToolbarProps {
  editor: Editor | null
  onInsertImage?: () => void
  onInsertQr?: () => void
}

function ToolbarButton({
  active,
  disabled,
  title,
  icon,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  title: string
  icon: ReactNode
  onClick: () => void
}) {
  const { token } = theme.useToken()

  return (
    <Tooltip title={title}>
      <Button
        type="text"
        size="small"
        disabled={disabled}
        icon={icon}
        onClick={onClick}
        style={{
          color: active ? token.colorPrimary : token.colorText,
          background: active ? token.colorPrimaryBg : undefined,
        }}
      />
    </Tooltip>
  )
}

export function DocumentTiptapToolbar({
  editor,
  onInsertImage,
  onInsertQr,
}: DocumentTiptapToolbarProps) {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!editor) {
      return
    }

    const rerender = () => {
      forceUpdate((value) => value + 1)
    }

    editor.on('transaction', rerender)
    editor.on('selectionUpdate', rerender)

    return () => {
      editor.off('transaction', rerender)
      editor.off('selectionUpdate', rerender)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  const headingValue = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'paragraph'

  return (
    <div
      className="document-tiptap-toolbar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        padding: '8px 12px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        flexShrink: 0,
      }}
    >
      <Space size={2} wrap>
        <ToolbarButton
          title={t('documents.toolbar.undo')}
          icon={<UndoOutlined />}
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.redo')}
          icon={<RedoOutlined />}
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        />

        <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

        <Select
          size="small"
          value={headingValue}
          style={{ width: 140 }}
          options={[
            { value: 'paragraph', label: t('documents.toolbar.paragraph') },
            { value: 'h1', label: t('documents.toolbar.heading1') },
            { value: 'h2', label: t('documents.toolbar.heading2') },
            { value: 'h3', label: t('documents.toolbar.heading3') },
          ]}
          onChange={(value) => {
            if (value === 'paragraph') {
              editor.chain().focus().setParagraph().run()
              return
            }

            const level = Number.parseInt(value.replace('h', ''), 10) as 1 | 2 | 3
            editor.chain().focus().toggleHeading({ level }).run()
          }}
        />

        <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

        <ToolbarButton
          title={t('documents.toolbar.bold')}
          icon={<BoldOutlined />}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.italic')}
          icon={<ItalicOutlined />}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.underline')}
          icon={<UnderlineOutlined />}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.strike')}
          icon={<StrikethroughOutlined />}
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

        <ToolbarButton
          title={t('documents.toolbar.bulletList')}
          icon={<UnorderedListOutlined />}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.orderedList')}
          icon={<OrderedListOutlined />}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

        <ToolbarButton
          title={t('documents.toolbar.alignLeft')}
          icon={<AlignLeftOutlined />}
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.alignCenter')}
          icon={<AlignCenterOutlined />}
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.alignRight')}
          icon={<AlignRightOutlined />}
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />

        <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

        <ToolbarButton
          title={t('documents.toolbar.blockquote')}
          icon={<span style={{ fontSize: 14, fontWeight: 700 }}>“</span>}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.horizontalRule')}
          icon={<LineOutlined />}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <ToolbarButton
          title={t('documents.toolbar.pageBreak')}
          icon={<FileTextOutlined />}
          onClick={() => editor.chain().focus().insertPageBreak().run()}
        />

        <Divider type="vertical" style={{ margin: '0 4px', height: 24 }} />

        <ToolbarButton
          title={t('documents.toolbar.insertImage')}
          icon={<PictureOutlined />}
          onClick={() => onInsertImage?.()}
        />
        <ToolbarButton
          title={t('documents.toolbar.insertQr')}
          icon={<QrcodeOutlined />}
          onClick={() => onInsertQr?.()}
        />
      </Space>
    </div>
  )
}
