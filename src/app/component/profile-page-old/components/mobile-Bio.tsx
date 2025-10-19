'use client';

interface MobileBioProps {
  userDescription?: string | null;
}

const MobileBio: React.FC<MobileBioProps> = ({ userDescription }) => {
  return (
    <div className="profile-mobile-bio">
      {userDescription && userDescription.trim() !== '' ? (
        userDescription
      ) : (
        <span style={{ opacity: 0.6 }}>Без описания</span>
      )}
    </div>
  );
};

export default MobileBio;


