import { AlertCircle } from 'lucide-react';

function ErrorBanner({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${className}`}
            style={{
                borderColor: '#3A2B2B',
                background: '#1F1519',
                color: '#E0A6A0',
            }}
        >
            <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span>{children}</span>
        </div>
    );
}

export { ErrorBanner };
