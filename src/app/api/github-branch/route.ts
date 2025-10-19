import { NextRequest, NextResponse } from 'next/server';
import { GITHUB_TOKEN, REPOS } from '../../../tools/constants';

type RepoKey = keyof typeof REPOS; // 'front' | 'frontDev'

export async function GET(req: NextRequest) {
    const branch = req.nextUrl.searchParams.get('branch');
    const repoParam = req.nextUrl.searchParams.get('repo') || 'front';

    if (!branch) {
        return NextResponse.json({ error: 'No branch specified' }, { status: 400 });
    }

    // Проверяем, что repoParam — валидный ключ REPOS
    if (!Object.keys(REPOS).includes(repoParam)) {
        return NextResponse.json({ error: 'Invalid repo specified' }, { status: 400 });
    }

    // Приводим к типу RepoKey
    const repoKey = repoParam as RepoKey;

    const { owner, name } = REPOS[repoKey];
    const url = `https://api.github.com/repos/${owner}/${name}/branches/${branch}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            'User-Agent': 'AniCat-Site'
        }
    });

    if (!res.ok) {
        return NextResponse.json({ error: 'GitHub error' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
}
