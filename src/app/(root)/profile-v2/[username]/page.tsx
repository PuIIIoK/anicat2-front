'use client';

import { useParams } from 'next/navigation';
import ProfileV2Provider from "../../../component/profile-v2/ProfileV2Provider";

export default function ProfileV2Page() {
    const { username } = useParams() as { username: string };
    
    return <ProfileV2Provider username={username} />;
}
