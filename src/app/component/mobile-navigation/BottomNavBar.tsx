'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AiFillHome } from 'react-icons/ai';
import { FaHeart, FaUser } from 'react-icons/fa';

const BottomNavBar: React.FC = () => {
    const pathname = usePathname();

    return (
        <nav className="bottom-navbar">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>
                <AiFillHome />
            </Link>
            <Link href="/profile/collection" className={pathname === '/profile/collection' ? 'active' : ''}>
                <FaHeart />
            </Link>
            <Link href="/profile" className={pathname === '/login' ? 'active' : ''}>
                <FaUser />
            </Link>
        </nav>
    );
};

export default BottomNavBar;
