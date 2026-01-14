import { useEffect } from 'react';

export function usePageTitle(title?: string) {
    useEffect(() => {
        const baseTitle = 'Soccer Circular';
        const finalTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} | Professional Football Academy Management`;

        const previousTitle = document.title;
        document.title = finalTitle;

        return () => {
            document.title = previousTitle;
        };
    }, [title]);
}
