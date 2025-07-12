'use client';
import React from 'react';

interface Props {
    onClose: () => void;
}

const TopUpModal: React.FC<Props> = ({ onClose }) => {
    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h3>Недостаточно средств</h3>
                <p>Пополните баланс, чтобы совершить покупку.</p>
                <button onClick={onClose}>Закрыть</button>
            </div>
        </div>
    );
};

export default TopUpModal;
