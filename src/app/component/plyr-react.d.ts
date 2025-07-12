

declare module 'plyr-react' {
    import { FC } from 'react';

    type Source = {
        type: 'audio' | 'video';
        title?: string;
        sources: Array<{
            src: string;
            type: string;
            size?: number;
        }>;
        tracks?: Array<{
            kind: string;
            label: string;
            src: string;
            srclang?: string;
            default?: boolean;
        }>;
    };

    interface PlyrProps {
        source: Source;
        options?: unknown;
        style?: React.CSSProperties;
    }

    const Plyr: FC<PlyrProps>;
    export default Plyr;
}
