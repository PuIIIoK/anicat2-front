"use client";

import React, { useState } from "react";

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [amount, setAmount] = useState("");
    const [agreeData, setAgreeData] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("tinkoff");

    const handleConfirm = () => {
        const parsed = parseInt(amount);
        if (!isNaN(parsed) && parsed > 0 && agreeData && agreeTerms) {
            onConfirm(parsed);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="balance-modal-overlay">
            <div className="balance-modal">
                <div className="anime-header">
                    <h2>Пополнение баланса AniCat</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="anime-image" />

                <div className="content">
                    <label>Сумма (₽)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Введите сумму"
                    />

                    <label>Способ оплаты:</label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                        <option value="tinkoff">Тинькофф (СПБ, Карта)</option>
                    </select>

                    <div className="checkboxes">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={agreeData}
                                onChange={(e) => setAgreeData(e.target.checked)}
                            />
                            Согласен с{" "}
                            <a
                                href="/reserv/docs/privacy_policy"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                политикой обработки данных
                            </a>
                        </label>

                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                            />
                            Согласен с{" "}
                            <a
                                href="/reserv/docs/public_offetrta_anicats"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                публичной офертой магазина
                            </a>
                        </label>
                    </div>

                    <button
                        className="confirm-btn"
                        onClick={handleConfirm}
                        disabled={!agreeData || !agreeTerms}
                    >
                        Пополнить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopUpModal;
