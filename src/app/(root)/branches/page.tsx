'use client';

import React, { useEffect, useState } from 'react';


interface BranchInfo {
    name: string;
    branch: string;    // git branch name
    repo: string;      // добавляем сюда
    type: 'public' | 'private';
    link: string;
}

interface BranchState extends BranchInfo {
    version: string;
    updatedAt: string;
}

const BRANCHES: BranchInfo[] = [
    {
        name: 'Публичная ветка',
        branch: 'main',
        repo: 'front',
        type: 'public',
        link: '/branches/public-changelog',
    },
    {
        name: 'Приватная ветка',
        branch: 'main',
        repo: 'frontDev',
        type: 'private',
        link: '/branches/private-changelog',
    }
];


function formatDate(dateStr: string) {
    // "2025-07-12T10:05:00Z" -> "12 июля 2025, 13:05"
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const BranchesPage: React.FC = () => {
    const [branches, setBranches] = useState<BranchState[] | null>(null);

    useEffect(() => {
        const fetchBranches = async () => {
            const updated: BranchState[] = [];
            for (const branch of BRANCHES) {
                try {
                    const res = await fetch(
                        `/api/github-branch?branch=${branch.branch}&repo=${branch.repo}`
                    );
                    if (!res.ok) throw new Error('GitHub error');
                    const data = await res.json();
                    const version = data.commit.sha.slice(0, 7);
                    const updatedAt = formatDate(data.commit.commit.author.date);
                    updated.push({
                        ...branch,
                        version,
                        updatedAt,
                    });
                } catch {
                    updated.push({
                        ...branch,
                        version: 'n/a',
                        updatedAt: 'неизвестно',
                    });
                }
            }
            setBranches(updated);
        };
        fetchBranches();
    }, []);
    const PLACEHOLDER_BRANCHES: BranchState[] = BRANCHES.map(branch => ({
        ...branch,
        version: '...',
        updatedAt: '...',
    }));
    return (
        <div className="branches-page">
            <h1>Ветки сайта AniCat</h1>
            <div className="branches-list">
                {(branches || PLACEHOLDER_BRANCHES).map(branch => (
                    <div className={`branch-card ${branch.type}`} key={branch.name}>
                        <div className="branch-header">
                            <h2>{branch.name}</h2>
                            <span className="branch-type">
                            {branch.type === 'public' ? 'stable' : 'testing'}
                                &nbsp;
                                <span style={{
                                    color: '#888',
                                    fontSize: '0.97em',
                                    fontWeight: 400,
                                }}>
                                ({branch.version || '-'})
                            </span>
                        </span>
                        </div>
                        <div className="branch-info">
                            <p className="branch-date">
                                Последнее обновление: <b>{branch.updatedAt || '-'}</b>
                            </p>
                        </div>
                        <a href={branch.link} className="branch-btn">
                            {branch.type === 'public' ? 'Посмотреть обновления' : 'Посмотреть изменения'}
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BranchesPage;
