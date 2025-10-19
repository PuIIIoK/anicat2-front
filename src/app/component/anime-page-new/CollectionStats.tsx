import React, { useEffect, useState } from "react";
import { API_SERVER } from "../../../tools/constants";

// Все возможные статусы коллекций
type CollectionType =
    | "FAVORITE"
    | "WATCHING"
    | "PLANNED"
    | "COMPLETED"
    | "PAUSED"
    | "DROPPED";

type StatsResponse = {
    total: number; // Кол-во пользователей, у которых аниме в коллекции
    byType: Record<CollectionType, number>;
};

type Props = {
    animeId: number | string;
};

// Сортировка и порядок отображения статусов (слева-направо)
const STATUS_ORDER: (CollectionType | "UNKNOWN")[] = [
    "FAVORITE",
    "WATCHING",
    "PLANNED",
    "COMPLETED",
    "PAUSED",
    "DROPPED",
    "UNKNOWN"
];

// Человеко-понятные подписи
const STATUS_LABELS: Record<CollectionType | "UNKNOWN", string> = {
    FAVORITE: "Избранное",
    WATCHING: "Смотрю",
    PLANNED: "В планах",
    COMPLETED: "Просмотрено",
    PAUSED: "Отложено",
    DROPPED: "Брошено",
    UNKNOWN: "Неизвестно"
};

// Цвета для полоски и кружков
const BAR_CLASSES: Record<CollectionType | "UNKNOWN", string> = {
    FAVORITE: "bar-favorite",
    WATCHING: "bar-watching",
    PLANNED: "bar-planned",
    COMPLETED: "bar-completed",
    PAUSED: "bar-paused",
    DROPPED: "bar-dropped",
    UNKNOWN: "bar-unknown"
};
const CIRCLE_CLASSES: Record<CollectionType | "UNKNOWN", string> = {
    FAVORITE: "circle-favorite",
    WATCHING: "circle-watching",
    PLANNED: "circle-planned",
    COMPLETED: "circle-completed",
    PAUSED: "circle-paused",
    DROPPED: "circle-dropped",
    UNKNOWN: "circle-unknown"
};

export default function CollectionStats({ animeId }: Props) {
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        if (!animeId) return;
        setLoading(true);

        // Получить статистику по аниме
        fetch(`${API_SERVER}/api/collection/stats/anime?animeId=${animeId}`)
            .then(res => res.json())
            .then(data => {
                if (!ignore) setStats(data);
            });

        // Получить общее количество пользователей
        fetch(`${API_SERVER}/api/collection/user-count`)
            .then(res => res.json())
            .then(data => {
                if (!ignore) setTotalUsers(data.count || data.total || 0);
                setLoading(false);
            });

        return () => { ignore = true; };
    }, [animeId]);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 700);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const byType = stats?.byType || {} as Record<CollectionType, number>;
    const knownTotal = stats?.total || 0;
    const unknown = Math.max((totalUsers || 0) - knownTotal, 0);
    const col1 = STATUS_ORDER.slice(0, 3);
    const col2 = STATUS_ORDER.slice(3);

    const getPercent = (type: CollectionType | "UNKNOWN") => {
        if (type === "UNKNOWN") {
            return totalUsers && totalUsers > 0 ? (unknown / totalUsers) * 100 : 0;
        }
        return totalUsers && totalUsers > 0 ? ((byType[type as CollectionType] || 0) / totalUsers) * 100 : 0;
    };
    if (loading || !stats || totalUsers == null) {
        return isMobile ? (
            <div className="collection-stats-mobile">
                <div className="collection-stats-title">В коллекциях</div>
                <div className="collection-stats-total">...</div>
                <div className="collection-stats-bar-mobile">
                    {STATUS_ORDER.map(type => (
                        <div
                            key={type}
                            className={`collection-segment-mobile ${BAR_CLASSES[type]}`}
                            style={{width: getPercent(type) + "%"}}
                        />
                    ))}
                </div>
                <div className="collection-stats-labels-mobile">
                    {STATUS_ORDER.map(type => (
                        <div className="collection-label-item-mobile" key={type} title={STATUS_LABELS[type]}>
                            <span className={`circle-mobile ${CIRCLE_CLASSES[type]}`}></span>
                            <span className="collection-label-mobile-count">
                    {type === "UNKNOWN"
                        ? unknown.toLocaleString("ru-RU")
                        : byType[type as CollectionType]?.toLocaleString("ru-RU") || 0}
                </span>
                            <span className="collection-label-mobile-name">
                    {STATUS_LABELS[type]}
                </span>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            // ПК версия (старая)
            <div className="collection-stats">
                <div className="title">В коллекциях у пользователей</div>
                <div className="total">...</div>
                <div className="diagram-bar-bg" style={{opacity: 0.5}}>
                    {STATUS_ORDER.map(type => (
                        <div className={`diagram-segment ${BAR_CLASSES[type]}`} key={type}
                             style={{width: `${100 / STATUS_ORDER.length}%`}}/>
                    ))}
                </div>
                <div className="status-inline-labels">
                    {STATUS_ORDER.map(type => (
                        <div className="status-label-item" key={type}>
                            <span className={`circle ${CIRCLE_CLASSES[type]}`}/>
                            <span>{STATUS_LABELS[type]}</span>
                            <span style={{color: "#b8b8b8", fontWeight: 600, marginLeft: 2}}>...</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="collection-stats-mobile">
                <div className="collection-stats-title">В коллекциях
                <span className="collection-stats-total">{knownTotal.toLocaleString("ru-RU")}</span>
                </div>
                <div className="collection-stats-bar-mobile">
                    {STATUS_ORDER.map(type => (
                        <div
                            key={type}
                            className={`collection-segment-mobile ${BAR_CLASSES[type]}`}
                            style={{width: getPercent(type) + "%"}}
                        />
                    ))}
                </div>
                <div className="collection-stats-labels-mobile-twocols">
                    <div className="collection-stats-col">
                        {col1.map(type => (
                            <div className="collection-label-item-mobile" key={type}>
                                <span className={`circle-mobile ${CIRCLE_CLASSES[type]}`}></span>
                                <span className="collection-label-mobile-name">{STATUS_LABELS[type]}</span>
                                <span className="collection-label-mobile-count">
                                    {type === "UNKNOWN"
                                        ? unknown.toLocaleString("ru-RU")
                                        : byType[type as CollectionType]?.toLocaleString("ru-RU") || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="collection-stats-col">
                        {col2.map(type => (
                            <div className="collection-label-item-mobile" key={type}>
                                <span className={`circle-mobile ${CIRCLE_CLASSES[type]}`}></span>
                                <span className="collection-label-mobile-name">{STATUS_LABELS[type]}</span>
                                <span className="collection-label-mobile-count">
                                    {type === "UNKNOWN"
                                        ? unknown.toLocaleString("ru-RU")
                                        : byType[type as CollectionType]?.toLocaleString("ru-RU") || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ----- Десктопная разметка (старая) -----
    return (
        <div className="collection-stats">
            <div className="title">В коллекциях у пользователей:</div>
            <div className="total">{knownTotal.toLocaleString("ru-RU")}</div>
            <div className="diagram-bar-bg">
                {STATUS_ORDER.map(type => (
                    <div
                        key={type}
                        className={`diagram-segment ${BAR_CLASSES[type]}`}
                        style={{width: getPercent(type) + "%"}}
                        data-tooltip={
                            type === "UNKNOWN"
                                ? unknown.toLocaleString("ru-RU")
                                : byType[type as CollectionType]?.toLocaleString("ru-RU") || 0
                        }
                    />
                ))}
            </div>
            <div className="status-inline-labels">
                {STATUS_ORDER.map(type => (
                    <div className="status-label-item" key={type}>
                        <span className={`circle ${CIRCLE_CLASSES[type]}`}/>
                        <span>{STATUS_LABELS[type]}</span>
                        <span style={{ color: "#b8b8b8", fontWeight: 600, marginLeft: 2 }}>
                            {type === "UNKNOWN"
                                ? unknown.toLocaleString("ru-RU")
                                : byType[type as CollectionType]?.toLocaleString("ru-RU") || 0}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
