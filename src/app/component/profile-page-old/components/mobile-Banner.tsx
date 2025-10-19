'use client';

interface MobileBannerProps {
  bannerUrl?: string | null;
  bannerAnimatedUrl?: string | null;
}

const MobileBanner: React.FC<MobileBannerProps> = ({ bannerUrl, bannerAnimatedUrl }) => {
  // Определяем, какое медиа использовать (приоритет: анимированное)
  const mediaSrc = bannerAnimatedUrl || bannerUrl;
  const isVideo = mediaSrc && (mediaSrc.includes('.webm') || mediaSrc.includes('.mp4'));

  return (
    <div className="profile-mobile-banner">
      {mediaSrc ? (
        isVideo ? (
          <video
            src={mediaSrc}
            autoPlay
            loop
            muted
            playsInline
            className="profile-mobile-banner-img"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={mediaSrc}
            alt="Баннер"
            className="profile-mobile-banner-img"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )
      ) : (
        <div className="banner-placeholder">Баннер</div>
      )}
    </div>
  );
};

export default MobileBanner;


