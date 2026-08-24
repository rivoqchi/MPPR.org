import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Progress,
  Space,
  Tag,
  Timeline,
  Typography,
  Upload,
  theme,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GuideVideo } from '@/features/guide/model/types'
import {
  deleteGuideVideo,
  fetchGuideVideos,
  formatGuideVideoSizeMb,
  getGuideVideoStreamUrl,
  markGuideVideoWatched,
  updateGuideVideo,
  uploadGuideVideo,
} from '@/shared/api/guide-videos-api'
import { useNotifyApiError } from '@/shared/hooks/useNotifyApiError'
import { useRolePermissions } from '@/shared/hooks/useRolePermissions'
import { fullHeightPageStyle, PAGE_SECTION_GAP, pageToolbarStyle } from '@/shared/lib/page-layout'

const { Title, Text, Paragraph } = Typography
const PAGE_KEY = '/guide'
const NEXT_COUNTDOWN_SECONDS = 3
const MAX_GUIDE_VIDEO_BYTES = 4 * 1024 * 1024 * 1024

export function GuidePage() {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const { message, modal } = App.useApp()
  const { notifyApiError } = useNotifyApiError()
  const { canView, canCreate, canEdit, canDelete } = useRolePermissions()

  const [videos, setVideos] = useState<GuideVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<GuideVideo | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [form] = Form.useForm<{ title: string; description: string }>()

  const selectedVideo = useMemo(
    () => videos.find((item) => item.id === selectedId) ?? videos[0],
    [selectedId, videos],
  )

  const selectedIndex = useMemo(
    () => (selectedVideo ? videos.findIndex((item) => item.id === selectedVideo.id) : -1),
    [selectedVideo, videos],
  )

  const loadVideos = async (preferId?: string) => {
    setLoading(true)
    try {
      const data = await fetchGuideVideos()
      setVideos(data)
      const nextId =
        preferId && data.some((item) => item.id === preferId)
          ? preferId
          : data[0]?.id
      setSelectedId(nextId)
    } catch (error) {
      notifyApiError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView(PAGE_KEY)) {
      setLoading(false)
      return
    }
    void loadVideos()
  }, [canView])

  useEffect(() => {
    setCountdown(null)
  }, [selectedVideo?.id])

  useEffect(() => {
    if (countdown === null) {
      return
    }

    if (countdown <= 0) {
      void handleMarkWatchedAndNext()
      return
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => (current === null ? null : current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [countdown])

  const openCreateDrawer = () => {
    setEditingVideo(null)
    form.resetFields()
    setSelectedFile(null)
    setUploadPercent(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = (video: GuideVideo) => {
    setEditingVideo(video)
    form.setFieldsValue({
      title: video.title,
      description: video.description,
    })
    setSelectedFile(null)
    setUploadPercent(null)
    setDrawerOpen(true)
  }

  const handleDelete = (video: GuideVideo) => {
    modal.confirm({
      title: t('guidePage.deleteConfirm.title'),
      content: t('guidePage.deleteConfirm.description'),
      okText: t('guidePage.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteGuideVideo(video.id)
          message.success(t('guidePage.messages.deleted'))
          await loadVideos(selectedId === video.id ? undefined : selectedId)
        } catch (error) {
          notifyApiError(error)
        }
      },
    })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      if (editingVideo) {
        const updated = await updateGuideVideo(editingVideo.id, {
          title: values.title,
          description: values.description ?? '',
        })
        setVideos((current) =>
          current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        )
        message.success(t('guidePage.messages.updated'))
      } else {
        if (!selectedFile) {
          message.error(t('guidePage.validation.fileRequired'))
          return
        }

        const created = await uploadGuideVideo({
          title: values.title,
          description: values.description ?? '',
          file: selectedFile,
          onProgress: (loaded, total) => {
            setUploadPercent(Math.round((loaded / total) * 100))
          },
        })
        message.success(t('guidePage.messages.created'))
        await loadVideos(created.id)
      }

      setDrawerOpen(false)
      setEditingVideo(null)
      form.resetFields()
      setSelectedFile(null)
      setUploadPercent(null)
    } catch (error) {
      if (error instanceof Error && error.message === 'GUIDE_VIDEO_FILE_TOO_LARGE') {
        message.error(t('guidePage.validation.fileTooLarge'))
        return
      }
      notifyApiError(error)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkWatchedAndNext = async () => {
    if (!selectedVideo) {
      return
    }

    setCountdown(null)

    try {
      const updated = await markGuideVideoWatched(selectedVideo.id)
      setVideos((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      )

      const nextVideo = videos[selectedIndex + 1]
      if (nextVideo) {
        setSelectedId(nextVideo.id)
      } else {
        message.success(t('guidePage.messages.completed'))
      }
    } catch (error) {
      notifyApiError(error)
    }
  }

  if (!canView(PAGE_KEY)) {
    return (
      <div style={fullHeightPageStyle}>
        <Empty description={t('guidePage.forbidden')} />
      </div>
    )
  }

  return (
    <div
      style={{
        ...fullHeightPageStyle,
        gap: PAGE_SECTION_GAP,
      }}
    >
      <div style={pageToolbarStyle}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {t('guidePage.title')}
          </Title>
        </div>
        {canCreate(PAGE_KEY) ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            {t('guidePage.actions.add')}
          </Button>
        ) : null}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)',
          gap: PAGE_SECTION_GAP,
        }}
      >
        <div
          style={{
            minHeight: 0,
            overflowY: 'auto',
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
            padding: 16,
          }}
        >
          {loading ? (
            <Text type="secondary">{t('common.loading')}</Text>
          ) : videos.length === 0 ? (
            <Empty description={t('guidePage.empty')} />
          ) : (
            <Timeline
              items={videos.map((video) => ({
                color: video.watched ? 'green' : video.id === selectedVideo?.id ? 'blue' : 'gray',
                children: (
                  <div
                    style={{
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: token.borderRadius,
                      background:
                        video.id === selectedVideo?.id
                          ? token.colorPrimaryBg
                          : 'transparent',
                    }}
                    onClick={() => setSelectedId(video.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Text strong>{video.title}</Text>
                      {video.watched ? <Tag color="success">{t('guidePage.watched')}</Tag> : null}
                    </div>
                    {video.description ? (
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ marginBottom: 4, marginTop: 4 }}
                      >
                        {video.description}
                      </Paragraph>
                    ) : null}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('guidePage.sizeLabel', { size: formatGuideVideoSizeMb(video.sizeBytes) })}
                    </Text>
                  </div>
                ),
              }))}
            />
          )}
        </div>

        <div
          style={{
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
            padding: 16,
            overflow: 'hidden',
          }}
        >
          {!selectedVideo ? (
            <Empty description={t('guidePage.selectVideo')} />
          ) : (
            <>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    {selectedVideo.title}
                  </Title>
                  {(canEdit(PAGE_KEY) || canDelete(PAGE_KEY)) && (
                    <Space size={8} wrap>
                      {canEdit(PAGE_KEY) ? (
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => openEditDrawer(selectedVideo)}
                        >
                          {t('common.edit')}
                        </Button>
                      ) : null}
                      {canDelete(PAGE_KEY) ? (
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(selectedVideo)}
                        >
                          {t('common.delete')}
                        </Button>
                      ) : null}
                    </Space>
                  )}
                </div>
                <Space wrap style={{ marginTop: 8 }}>
                  <Tag>
                    {t('guidePage.sizeLabel', {
                      size: formatGuideVideoSizeMb(selectedVideo.sizeBytes),
                    })}
                  </Tag>
                  {selectedVideo.watched ? (
                    <Tag color="success">{t('guidePage.watched')}</Tag>
                  ) : null}
                </Space>
                {selectedVideo.description ? (
                  <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                    {selectedVideo.description}
                  </Paragraph>
                ) : null}
              </div>

              <div style={{ position: 'relative', flex: 1, minHeight: 280 }}>
                <video
                  key={selectedVideo.id}
                  ref={videoRef}
                  controls
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    background: '#000',
                    borderRadius: token.borderRadius,
                    objectFit: 'contain',
                  }}
                  src={getGuideVideoStreamUrl(selectedVideo.id)}
                  onEnded={() => {
                    if (selectedIndex >= 0 && selectedIndex < videos.length - 1) {
                      setCountdown(NEXT_COUNTDOWN_SECONDS)
                    }
                  }}
                />

                {countdown !== null ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      borderRadius: token.borderRadius,
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 18 }}>
                      {t('guidePage.nextIn', { seconds: countdown })}
                    </Text>
                    <Button onClick={() => setCountdown(null)}>
                      {t('guidePage.actions.cancelNext')}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button type="primary" onClick={() => void handleMarkWatchedAndNext()}>
                  {t('guidePage.actions.markWatched')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={editingVideo ? t('guidePage.drawer.editTitle') : t('guidePage.drawer.createTitle')}
        onClose={() => {
          if (saving) {
            return
          }
          setDrawerOpen(false)
          setEditingVideo(null)
          form.resetFields()
          setSelectedFile(null)
          setUploadPercent(null)
        }}
        width={480}
        destroyOnHidden
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setDrawerOpen(false)
                setEditingVideo(null)
                form.resetFields()
                setSelectedFile(null)
              }}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="primary" loading={saving} onClick={() => void handleSave()}>
              {t('common.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={t('guidePage.fields.title')}
            rules={[{ required: true, message: t('guidePage.validation.titleRequired') }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label={t('guidePage.fields.description')}>
            <Input.TextArea rows={4} maxLength={4000} />
          </Form.Item>
          {!editingVideo ? (
            <Form.Item label={t('guidePage.fields.video')} required>
              <Upload
                accept="video/*"
                maxCount={1}
                fileList={
                  selectedFile
                    ? [
                        {
                          uid: 'guide-video',
                          name: selectedFile.name,
                          status: 'done',
                          size: selectedFile.size,
                          type: selectedFile.type,
                        },
                      ]
                    : []
                }
                beforeUpload={(file) => {
                  if (file.size > MAX_GUIDE_VIDEO_BYTES) {
                    message.error(t('guidePage.validation.fileTooLarge'))
                    return Upload.LIST_IGNORE
                  }
                  setSelectedFile(file)
                  return false
                }}
                onRemove={() => {
                  setSelectedFile(null)
                }}
              >
                <Button>{t('guidePage.actions.selectFile')}</Button>
              </Upload>
            </Form.Item>
          ) : null}
          {uploadPercent !== null ? (
            <Progress percent={uploadPercent} status={saving ? 'active' : 'normal'} />
          ) : null}
        </Form>
      </Drawer>
    </div>
  )
}
