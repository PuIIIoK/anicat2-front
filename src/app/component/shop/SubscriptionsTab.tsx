import { Coins, Star } from 'lucide-react';

interface Props {
    selected: string;
    onBuy: (price: number) => void;
}


interface Props {
    selected: string;
    onBuy: (price: number) => void;
}


const SubscriptionsTab: React.FC<Props> = ({ selected, onBuy }) => {
    const subscriptions = [
        {
            title: 'AniCat Premium (7 дней)',
            price: 99,
            bonus: 30,
        },
        {
            title: 'AniCat Premium (14 дней)',
            price: 139,
            bonus: 50,
        },
        {
            title: 'AniCat Premium (30 дней)',
            price: 239,
            bonus: 70,
        },
        {
            title: 'AniCat Premium (90 дней)',
            price: 339,
            bonus: 80,
        },
        {
            title: 'AniCat Premium (360 дней)',
            price: 469,
            bonus: 140,
        },
    ];

    const features = [
        {
            title: 'Отключение рекламы',
            price: 69,
            bonus: 20,
            description: 'Отключает всю рекламу на сайте',
        },
    ];

    if (selected === 'Платные функции') {
        return (
            <div className="subscriptions-tab">
                <h2>{selected}</h2>

                <div className="subscription-grid">
                    {features.map((item, idx) => (
                        <div key={idx} className="subscription-card">
                            <div className="subscription-title">{item.title}</div>
                            <div className="subscription-description" style={{ fontSize: '13px', color: '#aaa' }}>
                                {item.description}
                            </div>
                            <div className="subscription-price">
                <span className="price">
                  {item.price} <Coins className="icon coin" size={16} />
                </span>
                                <span className="bonus">
                  +{item.bonus} <Star className="icon bonus" size={16} />
                </span>
                            </div>
                            <button className="buy-button" onClick={() => onBuy(item.price)}>Купить</button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="subscriptions-tab">
            <h2>{selected}</h2>

            <div className="subscription-description">
                <h3 className="description-title">
                    Что даёт <strong>AniCat Premium</strong>?
                </h3>
                <ul className="features-list">
                    <li>
                        <span className="emoji">🔓</span>
                        <span>Полный доступ ко всем функциям без ограничений</span>
                    </li>
                    <li>
                        <span className="emoji">✨</span>
                        <span>Уникальный значок рядом с ником</span>
                    </li>
                    <li>
                        <span className="emoji">🎨</span>
                        <span>Эксклюзивные фоны и аватары</span>
                    </li>
                    <li>
                        <span className="emoji">🔸</span>
                        <span>Анимированный баннер и аватар</span>
                    </li>
                    <li>
                        <span className="emoji">⛔️</span>
                        <span>Отключение всей рекламы на сайте</span>
                    </li>
                </ul>
            </div>

            <div className="subscription-grid">
                {subscriptions.map((sub, idx) => (
                    <div key={idx} className="subscription-card">
                        <div className="subscription-title">{sub.title}</div>
                        <div className="subscription-price">
              <span className="price">
                {sub.price} <Coins className="icon coin" size={16} />
              </span>
                            <span className="bonus">
                +{sub.bonus} <Star className="icon bonus" size={16} />
              </span>
                        </div>
                        <button className="buy-button" onClick={() => onBuy(sub.price)}>Купить</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SubscriptionsTab;
