'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Coins, Plus, Star, ChevronDown, ChevronRight } from 'lucide-react';
import SubscriptionsTab from '@/component/shop/SubscriptionsTab';
import TopUpModal from "@/component/shop/ModelPopUt";
import { API_SERVER } from "../../../tools/constants";

export default function BalanceShopPage() {
    const router = useRouter();

    const getCookieToken = () => {
        const match = document.cookie.match(/token=([^;]+)/);
        return match ? match[1] : '';
    };

    useEffect(() => {
        const checkAuth = async () => {
            const token = getCookieToken();
            if (!token) {
                router.push('/shop/auth?redirect=/shop');
                return;
            }

            try {
                const res = await fetch(`${API_SERVER}/api/auth/check-auth`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    router.push('/shop/auth?redirect=/shop');
                    return;
                }

                // Профиль
                const profileRes = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setNickname(profileData.username);

                    const coverRes = await fetch(`${API_SERVER}/api/profile/get-cover-lk`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    if (coverRes.ok) {
                        const coverData = await coverRes.json();
                        if (coverData.url) {
                            setAvatarUrl(coverData.url);
                        }
                    }
                }


            } catch (error) {
                console.error("Ошибка при проверке авторизации:", error);
                router.push('/shop/auth?redirect=/shop');
            }
        };

        checkAuth();
    }, []);



    const [selectedCategory, setSelectedCategory] = useState('Подписки');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Подписки']));
    const [isModalOpen, setModalOpen] = useState(false);
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [nickname, setNickname] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');


    const balance = {
        anibonus: 0,
    };

    const menu = {
        Подписки: ['AniCat Premium', 'Платные функции'],
        Украшения: ['Аватарки', 'Баннера', 'Рамки'],
        Обмен: ['AniCoins'],
    };

    const fetchBalance = async () => {
        try {
            const res = await fetch(`${API_SERVER}/api/payment/balance`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            const data = await res.json();
            if (data.balance !== undefined) {
                setUserBalance(data.balance);
            }
        } catch (e) {
            console.error('Ошибка при получении баланса:', e);
        }
    };

    const checkPaymentStatus = async () => {
        const orderId = localStorage.getItem('lastPaymentOrderId');
        if (!orderId) return;

        try {
            const res = await fetch(`${API_SERVER}/api/payment/status?orderId=${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const data = await res.json();
            if (data.status === 'PAID') {
                await fetchBalance();
                localStorage.removeItem('lastPaymentOrderId');
            }
        } catch (e) {
            console.error('Ошибка при проверке платежа:', e);
        }
    };

    useEffect(() => {
        fetchBalance();
        checkPaymentStatus();
    }, []);

    const handleBuy = (price: number) => {
        if (userBalance !== null && userBalance >= price) {
            setUserBalance(userBalance - price);
            alert('Покупка совершена!');
        } else {
            setModalOpen(true);
        }
    };

    const toggleCategory = (cat: string, firstSub: string) => {
        const newExpanded = new Set(expandedCategories);
        if (expandedCategories.has(cat)) {
            newExpanded.delete(cat);
        } else {
            newExpanded.add(cat);
            setSelectedCategory(cat);
            setSelectedSubcategory(firstSub);
        }
        setExpandedCategories(newExpanded);
    };

    return (
        <div className="balance-page">
            {/* Баланс */}
            <div className="balance-header">
                <button className="back-button" onClick={() => router.push('/')}>
                    ← Вернуться на главную
                </button>
                <div className="balance-panel">
                    <div className="balance-avatar" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {avatarUrl && (
                            <Image src={avatarUrl} alt="avatar" width={42} height={42} style={{borderRadius: '50%'}}/>
                        )}
                        <span style={{color: '#fff', fontWeight: 'bold'}}>{nickname}</span>
                    </div>

                    <div className="balance-values">
                        <div className="balance-line">
                            <Coins className="icon green" size={16}/>
                            <span className="text green">
                                {userBalance !== null ? userBalance.toFixed(2) : '...'}
                            </span>
                        </div>
                        <div className="balance-line">
                            <Star className="icon yellow" size={16}/>
                            <span className="text yellow">{balance.anibonus.toFixed(2)}</span>
                            <span className="tooltip">?</span>
                        </div>
                    </div>

                    <button className="top-up-button" onClick={() => setModalOpen(true)}>
                        Пополнить <Plus size={16}/>
                    </button>
                </div>
            </div>

            {/* Сайдбар + Контент */}
            <div className="shop-layout">
                <aside className="shop-sidebar">
                    {Object.entries(menu).map(([cat, subcats]) => (
                        <div key={cat} className="sidebar-group">
                            <button
                                className={`sidebar-category ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => toggleCategory(cat, subcats[0])}
                            >
                                {expandedCategories.has(cat) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span style={{ marginLeft: '6px' }}>{cat}</span>
                            </button>
                            {expandedCategories.has(cat) && (
                                <div className="sidebar-subcategories">
                                    {subcats.map((sub) => (
                                        <button
                                            key={sub}
                                            className={`sidebar-sub ${selectedSubcategory === sub ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setSelectedSubcategory(sub);
                                            }}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </aside>

                <main className="shop-content">
                    {selectedCategory === 'Подписки' && (
                        <SubscriptionsTab selected={selectedSubcategory} onBuy={handleBuy} />
                    )}
                </main>
            </div>

            {/* Модальное окно пополнения */}
            {isModalOpen && (
                <TopUpModal
                    isOpen={isModalOpen}
                    onClose={() => setModalOpen(false)}
                    onConfirm={async (amount: number) => {
                        try {
                            const getCookieToken = () => {
                                const match = document.cookie.match(/token=([^;]+)/);
                                return match ? match[1] : '';
                            };

                            const token = getCookieToken();
                            if (!token) {
                                alert("Вы не авторизованы");
                                return;
                            }

                            // Получаем профиль с username
                            const profileRes = await fetch(`${API_SERVER}/api/auth/get-profile`, {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                },
                            });

                            if (!profileRes.ok) {
                                alert("Не удалось получить профиль");
                                return;
                            }

                            const profileData = await profileRes.json();
                            const username = profileData.username;

                            if (!username) {
                                alert("Профиль не содержит username");
                                return;
                            }

                            const res = await fetch(`${API_SERVER}/api/payment/live`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                                body: JSON.stringify({ amount, username }),
                            });

                            const data = await res.json();
                            if (data.url && data.orderId) {
                                localStorage.setItem('lastPaymentOrderId', data.orderId);
                                window.location.href = data.url;
                            } else {
                                alert('Ошибка создания платежа');
                            }
                        } catch (e) {
                            console.error('Ошибка оплаты:', e);
                            alert('Ошибка при инициализации платежа');
                        }
                    }}
                />
            )}
        </div>
    );
}
