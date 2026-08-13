import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function GenreSearchInput({
    query,
    onQueryChange,
}: {
    query: string;
    onQueryChange: (v: string) => void;
}) {
    return (
        <div className='relative w-56'>
            <Search className='absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground' />
            <Input
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder='Cari genre...'
                className='h-7 pl-7 pr-7 text-xs'
            />
            {query && (
                <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => onQueryChange('')}
                    className='absolute right-0.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground hover:bg-transparent'
                >
                    <X className='h-3 w-3' />
                </Button>
            )}
        </div>
    );
}
