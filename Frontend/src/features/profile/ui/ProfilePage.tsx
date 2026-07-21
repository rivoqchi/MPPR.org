import { useState } from 'react'
import { selectIsAuthenticated, useAuthStore } from '@/entities/user/model/auth-store'
import { ProfileChangePasswordDrawer } from '@/features/profile/ui/ProfileChangePasswordDrawer'
import { ProfileEditDrawer } from '@/features/profile/ui/ProfileEditDrawer'
import { UserDetail } from '@/features/users/ui/UserDetail'
import { fullHeightPageStyle } from '@/shared/lib/page-layout'

export function ProfilePage() {
  const currentUser = useAuthStore((state) => state.currentUser)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false)

  if (!isAuthenticated || !currentUser) {
    return null
  }

  return (
    <>
      <div style={fullHeightPageStyle}>
        <UserDetail
          user={currentUser}
          onEdit={() => setDrawerOpen(true)}
          onChangePassword={() => setPasswordDrawerOpen(true)}
        />
      </div>

      <ProfileEditDrawer
        open={drawerOpen}
        user={currentUser}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setDrawerOpen(false)}
      />

      <ProfileChangePasswordDrawer
        open={passwordDrawerOpen}
        user={currentUser}
        onClose={() => setPasswordDrawerOpen(false)}
        onSaved={() => setPasswordDrawerOpen(false)}
      />
    </>
  )
}
