import { Typography } from 'antd'
import type { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      <div style={{ flex: '1 1 240px' }}>
        <Typography.Text>{label}</Typography.Text>
        {description ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
            {description}
          </Typography.Paragraph>
        ) : null}
      </div>
      <div style={{ flex: '0 0 auto' }}>{children}</div>
    </div>
  )
}
