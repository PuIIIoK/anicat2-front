'use client';

import { useRouter } from 'next/navigation';
import { Settings, LogOut, Crown, Users } from 'lucide-react';
import { useState } from 'react';
import MobileFriendsFullModal from './mobile-FriendsFullModal';
import { performLogout } from '../../../utils/logoutUtils';

interface MobileUtilsProps {
  isOwnProfile: boolean;
  userRoles: string[];
}

const MobileUtils: React.FC<MobileUtilsProps> = ({ isOwnProfile, userRoles }) => {
  const router = useRouter();
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  if (!isOwnProfile) return null;

  return (
    <div className="profile-mobile-utils">
      <div className="utils-buttons">
        <button className="utils-btn settings-btn" onClick={() => router.push('/profile/settings')}>
          <span className="btn-icon"><Settings size={18} /></span>
          <span className="btn-text">Настройки</span>
        </button>
        <button className="utils-btn" onClick={() => setFriendsModalOpen(true)}>
          <span className="btn-icon"><Users size={18} /></span>
          <span className="btn-text">Список друзей</span>
        </button>
        {(userRoles.includes('MODERATOR') || userRoles.includes('ADMIN')) && (
          <button className="utils-btn admin-btn" onClick={() => router.push('/admin_panel')}>
            <span className="btn-icon"><Crown size={18} /></span>
            <span className="btn-text">Админ панель</span>
          </button>
        )}
        <button
          className="utils-btn logout-btn"
          onClick={() => performLogout()}
        >
          <span className="btn-icon"><LogOut size={18} /></span>
          <span className="btn-text">Выйти</span>
        </button>
      </div>
      <MobileFriendsFullModal isOpen={friendsModalOpen} onClose={() => setFriendsModalOpen(false)} />
    </div>
  );
};

export default MobileUtils;


