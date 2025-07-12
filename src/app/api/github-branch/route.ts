import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const branch = req.nextUrl.searchParams.get('branch');
    if (!branch) {
        return NextResponse.json({ error: 'No branch specified' }, { status: 400 });
    }
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // ← .env.local

    const REPO_OWNER = 'PuIIIoK';
    const REPO_NAME = 'anicat2-front';
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/${branch}`;

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
