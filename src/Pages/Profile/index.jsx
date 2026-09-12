import ProtectedLayout from '@/components/ProtectedLayout/ProtectedLayout'
import Profile from '@/components/Profile/Profile'

export default function ProfilePage() {
  return (
    <ProtectedLayout>
      <div className="profile-page">
        <Profile />
      </div>
    </ProtectedLayout>
  )
}
