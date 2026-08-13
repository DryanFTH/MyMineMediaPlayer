import { useMemo, useState } from 'react';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

function getPageRange(current: number, max: number): (number | 'ellipsis')[] {
    const delta = 1;
    const range: (number | 'ellipsis')[] = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(max - 1, current + delta);

    range.push(1);
    if (left > 2) range.push('ellipsis');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < max - 1) range.push('ellipsis');
    if (max > 1) range.push(max);

    return range;
}

export function PaginationBar({
    currentPage,
    maxPage,
    isFetching,
    onGoToPage,
}: {
    currentPage: number;
    maxPage: number;
    isFetching: boolean;
    onGoToPage: (page: number) => void;
}) {
    const [jumpValue, setJumpValue] = useState('');
    const pageRange = useMemo(
        () => getPageRange(currentPage, maxPage),
        [currentPage, maxPage],
    );

    if (maxPage <= 1) return null;

    function handleJumpSubmit() {
        const parsed = Number(jumpValue);
        if (Number.isInteger(parsed)) onGoToPage(parsed);
        setJumpValue('');
    }

    return (
        <div className='mt-8 flex flex-col items-center gap-3'>
            <div className='flex items-center gap-1'>
                <Button
                    size='icon'
                    variant='outline'
                    disabled={currentPage <= 1 || isFetching}
                    onClick={() => onGoToPage(1)}
                    className='h-8 w-8'
                    title='Halaman pertama'
                >
                    <ChevronsLeft className='h-4 w-4' />
                </Button>
                <Button
                    size='icon'
                    variant='outline'
                    disabled={currentPage <= 1 || isFetching}
                    onClick={() => onGoToPage(currentPage - 1)}
                    className='h-8 w-8'
                >
                    <ChevronLeft className='h-4 w-4' />
                </Button>

                {pageRange.map((p, i) =>
                    p === 'ellipsis' ? (
                        <span
                            key={`ellipsis-${i}`}
                            className='px-1.5 text-xs text-muted-foreground'
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={p}
                            size='icon'
                            variant={p === currentPage ? 'default' : 'outline'}
                            disabled={isFetching}
                            onClick={() => onGoToPage(p)}
                            className='h-8 w-8 text-xs'
                        >
                            {p}
                        </Button>
                    ),
                )}

                <Button
                    size='icon'
                    variant='outline'
                    disabled={currentPage >= maxPage || isFetching}
                    onClick={() => onGoToPage(currentPage + 1)}
                    className='h-8 w-8'
                >
                    <ChevronRight className='h-4 w-4' />
                </Button>
                <Button
                    size='icon'
                    variant='outline'
                    disabled={currentPage >= maxPage || isFetching}
                    onClick={() => onGoToPage(maxPage)}
                    className='h-8 w-8'
                    title='Halaman terakhir'
                >
                    <ChevronsRight className='h-4 w-4' />
                </Button>
            </div>

            <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground/70'>Ke halaman</span>
                <input
                    value={jumpValue}
                    onChange={e => setJumpValue(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleJumpSubmit()}
                    placeholder={String(currentPage)}
                    className='h-8 w-16 rounded-md border border-input bg-transparent px-2 text-center text-xs shadow-xs'
                    inputMode='numeric'
                />
                <Button
                    size='sm'
                    variant='outline'
                    disabled={!jumpValue || isFetching}
                    onClick={handleJumpSubmit}
                    className='h-8 text-xs'
                >
                    Go
                </Button>
            </div>
        </div>
    );
}
