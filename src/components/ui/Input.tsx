import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  type,
  className,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={id}
          type={resolvedType}
          className={clsx(
            'w-full h-10 rounded-[10px] border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 text-sm transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error
              ? 'border-error-500'
              : 'border-slate-200 dark:border-slate-700',
            leftIcon ? 'pl-10' : 'pl-3',
            (rightIcon || isPassword) ? 'pr-10' : 'pr-3',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {rightIcon && !isPassword && (
          <span className="absolute right-3 text-slate-400 pointer-events-none">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-error-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
