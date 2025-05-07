// types/react-kinescope-player.d.ts
declare module 'react-kinescope-player' {
    import * as React from 'react';

    interface KinescopePlayerProps {
        videoId: string;
        autoPlay?: boolean;
        controls?: boolean;
        className?: string;
        style?: React.CSSProperties;
    }

    export const KinescopePlayer: React.FC<KinescopePlayerProps>;
}
