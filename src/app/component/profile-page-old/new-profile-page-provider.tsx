'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PropagateLoader } from 'react-spinners';

interface ProfileMainInfoProps {
    username: string;
}

const ProfileMainInfo: React.FC<ProfileMainInfoProps> = ({ username }) => {
    const router = useRouter();

    useEffect(() => {
        router.replace(`/profile/${username}`);
    }, [username, router]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh'
        }}>
            <PropagateLoader color="#ff4e4e" size={20} />
        </div>
    );
};

export default ProfileMainInfo;
