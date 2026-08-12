import { useState } from 'react';

import { useLocation, useNavigate } from 'react-router';

import type { LucideProps } from 'lucide-react';
import {
    CalendarClock,
    CalendarDays,
    ChevronDown,
    Globe,
    Layers,
    LayoutDashboardIcon,
    Library,
    ListVideo,
    PackagePlus,
    Search,
    Settings as SettingsIcon,
} from 'lucide-react';

import Icon from '@/assets/icon.webp';

import pkg from '../../../package.json';
import { cn } from '../../lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

export type SidebarItem = {
    id: string;
    label: string;
    icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'>>;
    href?: string;
    disabled?: boolean;
    child?: SidebarItem[];
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon, href: '/' },
    {
        id: 'library',
        label: 'Library',
        icon: Library,
        child: [
            {
                id: 'anime-list',
                label: 'Daftar Anime',
                icon: ListVideo,
                href: '/library',
            },
            {
                id: 'library-genre-list',
                label: 'Daftar Genre',
                icon: Layers,
                href: '/library/genre',
            },
            {
                id: 'from-batch',
                label: 'Tambah Dari Batch',
                icon: PackagePlus,
                href: '/library/from-batch',
            },
        ],
    },
    {
        id: 'otakudesu',
        label: 'Otakudesu',
        icon: Globe,
        child: [
            {
                id: 'search',
                label: 'Cari Anime',
                icon: Search,
                href: '/otakudesu/search',
            },
            {
                id: 'ongoing',
                label: 'Anime Ongoing',
                icon: CalendarDays,
                href: '/otakudesu/ongoing',
            },
            {
                id: 'genre_list',
                label: 'Daftar Genre',
                icon: Layers,
                href: '/otakudesu/genre',
            },
            {
                id: 'season',
                label: 'Anime Musiman',
                icon: CalendarClock,
                href: '/otakudesu/season',
            },
        ],
    },
];

export const SIDEBAR_FOOTER_ITEMS: SidebarItem[] = [
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon, href: '/settings' },
];

export function Sidebar({
    items = SIDEBAR_ITEMS,
    footerItems = SIDEBAR_FOOTER_ITEMS,
}: {
    items?: SidebarItem[];
    footerItems?: SidebarItem[];
}) {
    const location = useLocation();

    return (
        <aside className='flex min-w-64 h-screen flex-col border-r bg-sidebar border-sidebar-border'>
            <div className='flex flex-col gap-1 px-5 py-5 border-b border-sidebar-border'>
                <div className='flex items-center gap-2'>
                    <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10'>
                        <img src={Icon} alt='My Mine Media Player' />
                    </div>
                    <span
                        className='text-sm font-semibold text-sidebar-foreground'
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        My Mine Media Player
                    </span>
                </div>
                <span className='pl-9 text-[11px] text-muted-foreground'>
                    v{pkg.version}
                </span>
            </div>

            <nav className='flex-1 space-y-0.5 px-2.5 py-4 overflow-y-auto'>
                {items.map(item => {
                    if (item.child) return buildSidebarGroup(item, location.pathname);
                    if (item.href) return buildSidebarItem(item, location.pathname);
                    return null;
                })}
            </nav>

            <nav className='space-y-0.5 px-2.5 py-4 border-t border-sidebar-border'>
                {footerItems.map(item => {
                    if (item.child) return buildSidebarGroup(item, location.pathname);
                    if (item.href) return buildSidebarItem(item, location.pathname);
                    return null;
                })}
            </nav>
        </aside>
    );
}

const baseItemClass =
    'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed';

const buildSidebarItem = (item: SidebarItem, activePath: string) => {
    const navigate = useNavigate();

    const Icon = item.icon;
    const isActive = item.href === activePath;
    const isDisabled = item.disabled;
    const href = item.href ?? '/';

    return (
        <button
            key={item.id}
            type='button'
            disabled={isDisabled}
            onClick={() => !isDisabled && navigate(href)}
            className={cn(
                baseItemClass,
                isActive
                    ? 'bg-primary/10 text-sidebar-foreground'
                    : isDisabled
                      ? 'text-muted-foreground/50'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
        >
            {isActive && (
                <span className='absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary' />
            )}
            <Icon
                className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')}
                strokeWidth={2}
            />
            <span className='flex-1 truncate'>{item.label}</span>
            {isDisabled && (
                <span className='rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide bg-sidebar-border text-muted-foreground'>
                    Segera
                </span>
            )}
        </button>
    );
};

const buildSidebarGroup = (item: SidebarItem, activePath: string) => {
    const [open, setOpen] = useState<boolean>(false);

    const Icon = item.icon;
    const isActive = item.href === activePath;
    const isDisabled = item.disabled;
    const child = item.child ?? [];

    return (
        <Collapsible key={item.id} open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    type='button'
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setOpen(prev => !prev)}
                    className={cn(
                        baseItemClass,
                        isActive
                            ? 'bg-primary/10 text-sidebar-foreground'
                            : isDisabled
                              ? 'text-muted-foreground/50'
                              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                >
                    {isActive && (
                        <span className='absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary' />
                    )}
                    <Icon
                        className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')}
                        strokeWidth={2}
                    />
                    <span className='flex-1 truncate'>{item.label}</span>
                    {isDisabled && (
                        <span className='rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide bg-sidebar-border text-muted-foreground'>
                            Segera
                        </span>
                    )}
                    <div className='flex-1 flex justify-end'>
                        <ChevronDown className='size-4 duration-300 ease-in-out group-data-[state=open]:rotate-180' />
                    </div>
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent asChild>
                <nav className='flex-1 space-y-0.5 pl-2.5'>
                    {child.map(item => {
                        if (item.child) return buildSidebarGroup(item, activePath);
                        if (item.href) return buildSidebarItem(item, activePath);
                        return null;
                    })}
                </nav>
            </CollapsibleContent>
        </Collapsible>
    );
};
