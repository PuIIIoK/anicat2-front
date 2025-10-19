import React from 'react';

interface StarRatingProps {
    rating: number; // текущий рейтинг (0–5)
    onChange: (newRating: number) => void;
    disabled?: boolean; // если true — клики блокируются
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, disabled = false }) => {
    return (
        <div style={{ display: 'inline-flex', gap: 4, userSelect: 'none' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    style={{
                        cursor: disabled ? 'default' : 'pointer',
                        color: star <= rating ? '#ffb800' : '#ccc',
                        fontSize: 30,
                        transition: 'color 0.2s',
                        userSelect: 'none',
                    }}
                    onClick={() => {
                        if (!disabled) onChange(star);
                    }}
                    aria-label={`Оценка ${star} звёзд`}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={(e) => {
                        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onChange(star);
                        }
                    }}
                >
          ★
        </span>
            ))}
        </div>
    );
};

export default StarRating;
