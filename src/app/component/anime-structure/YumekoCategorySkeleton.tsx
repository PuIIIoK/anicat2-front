import React from 'react';

const YumekoCategorySkeleton: React.FC = () => {
    return (
        <section className="yumeko-category">
            <div className="yumeko-category-header">
                <div className="yumeko-category-title-link" style={{ textDecoration: 'none' }}>
                    <div
                        className="skeleton-shimmer"
                        style={{
                            width: '200px',
                            height: '28px',
                            borderRadius: '8px',
                            background: 'var(--bg-secondary, #2a2a2a)'
                        }}
                    ></div>
                </div>

                <div className="yumeko-category-controls" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                    <div className="yumeko-scroll-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                        </svg>
                    </div>
                    <div className="yumeko-scroll-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                        </svg>
                    </div>
                    <div className="yumeko-view-all">
                        Все аниме
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="yumeko-category-content" style={{ overflow: 'hidden' }}>
                {[...Array(6)].map((_, index) => (
                    <div key={index} className="yumeko-card-item">
                        <div className="yumeko-anime-card" style={{ pointerEvents: 'none' }}>
                            <div className="yumeko-anime-card-cover skeleton-shimmer" style={{ background: 'var(--bg-secondary, #1a1a2e)', border: 'none' }}></div>
                            <div className="yumeko-anime-card-info">
                                <div className="skeleton-shimmer" style={{ width: '80%', height: '18px', borderRadius: '4px', marginBottom: '8px', background: 'var(--bg-secondary, #1a1a2e)' }}></div>
                                <div className="yumeko-anime-card-meta">
                                    <div className="skeleton-shimmer" style={{ width: '40px', height: '14px', borderRadius: '4px', background: 'var(--bg-secondary, #1a1a2e)' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .skeleton-shimmer {
                    animation: skeleton-shimmer 2s infinite linear;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.03) 25%,
                        rgba(255, 255, 255, 0.08) 37%,
                        rgba(255, 255, 255, 0.03) 63%
                    ) !important;
                    background-size: 400% 100% !important;
                }
                @keyframes skeleton-shimmer {
                    0% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0 50%;
                    }
                }
            `}</style>
        </section>
    );
};

export default YumekoCategorySkeleton;
