import { cn } from '../../lib/utils'
import { BRAND } from '../../config/brand'

type IconSize = 'sm' | 'md' | 'lg'
type WordmarkSize = 'sm' | 'md' | 'lg'

const iconSizeClass: Record<IconSize, string> = {
  sm: 'h-9 w-9 text-[11px]',
  md: 'h-12 w-12 text-sm',
  lg: 'h-14 w-14 text-base',
}

const wordmarkSizeClass: Record<WordmarkSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
}

export function BrandIcon({
  size = 'md',
  className,
}: {
  size?: IconSize
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-purple-600 text-white shadow-[0_14px_24px_-18px_rgba(109,40,217,0.9)]',
        iconSizeClass[size],
        className
      )}
      aria-label={BRAND.appName}
    >
      <span className="font-bold tracking-[-0.02em]">SM</span>
    </div>
  )
}

export function BrandWordmark({
  size = 'md',
  showSlogan = false,
  className,
}: {
  size?: WordmarkSize
  showSlogan?: boolean
  className?: string
}) {
  return (
    <div className={cn('inline-flex flex-col leading-none', className)}>
      <div className={cn('inline-flex items-end gap-0.5 font-bold tracking-[-0.03em]', wordmarkSizeClass[size])}>
        <span style={{ color: BRAND.palette.deepViolet }}>{BRAND.primaryWord}</span>
        <span className="font-normal" style={{ color: BRAND.palette.vividViolet }}>
          {BRAND.accentWord}
        </span>
      </div>
      {showSlogan && (
        <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-500">
          {BRAND.slogan}
        </span>
      )}
    </div>
  )
}

export function BrandLockup({
  iconSize: _iconSize = 'md',
  wordmarkSize = 'md',
  showSlogan = false,
  className,
}: {
  iconSize?: IconSize
  wordmarkSize?: WordmarkSize
  showSlogan?: boolean
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center', className)}>
      <BrandWordmark size={wordmarkSize} showSlogan={showSlogan} />
    </div>
  )
}

