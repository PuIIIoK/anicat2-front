// src/pages/api/kinescope-search.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { KINESCOPE_API_TOKEN, KINESCOPE_API_BASE } from '../../../tools/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { title } = req.query;

    if (!title) return res.status(400).json({ error: 'No title provided' });

    try {
        const response = await fetch(`${KINESCOPE_API_BASE}/videos?search=${encodeURIComponent(title as string)}`, {
            headers: {
                Authorization: `Bearer ${KINESCOPE_API_TOKEN}`,
            },
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch {
        return res.status(500).json({ error: 'Ошибка при запросе к Kinescope' });
    }
}
