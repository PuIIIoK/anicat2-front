import React from 'react';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'anicat-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}
