'use client';

type Tab = 'overview' | 'collections' | 'friends' | 'activity' | 'reviews' | 'utils';

interface MobileTabsBarProps {
  activeTab: Tab;
  isOwnProfile: boolean;
  onChange: (tab: Tab) => void;
  tabs?: Tab[]; // опционально: явно задать набор вкладок
}

const LABELS: Record<Tab, string> = {
  overview: 'Обзор',
  collections: 'Коллекции',
  friends: 'Друзья',
  activity: 'Активность',
  reviews: 'Отзывы',
  utils: 'Утилиты',
};

const MobileTabsBar: React.FC<MobileTabsBarProps> = ({ activeTab, isOwnProfile, onChange, tabs }) => {
  const defaultTabs: Tab[] = ['overview', 'collections', 'friends', 'activity', 'reviews'];
  const baseTabs = tabs ?? defaultTabs;
  const finalTabs: Tab[] = isOwnProfile
    ? baseTabs.includes('utils') ? baseTabs : [...baseTabs, 'utils']
    : baseTabs.filter((t) => t !== 'utils');

  return (
    <div className="profile-mobile-tabs-bar">
      {finalTabs.map((tab) => (
        <button
          key={tab}
          className={`profile-mobile-tab-btn${activeTab === tab ? ' active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {LABELS[tab]}
        </button>
      ))}
    </div>
  );
};

export default MobileTabsBar;


