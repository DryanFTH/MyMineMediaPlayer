import { Sidebar } from './Sidebar';

export default ({ children }: { children: React.ReactNode }) => {
    return (
        <div
            className='relative flex h-screen w-full overflow-y-hidden'
            style={{ background: '#121212' }}
        >
            <Sidebar />

            <div className='relative min-h-screen flex-1 overflow-y-auto'>{children}</div>
        </div>
    );
};
