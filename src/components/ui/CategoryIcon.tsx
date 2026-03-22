import {
  ShoppingCart, Circle, Wifi, ShieldCheck, Key,
  UtensilsCrossed, Car, Heart, BookOpen, Music, Zap,
  ShoppingBag, CreditCard, Home, Briefcase, Code,
  TrendingUp, Gift, MoreHorizontal, DollarSign,
  Banknote, PiggyBank, Plane, Coffee, Dumbbell,
  Shirt, Tv, Phone, Globe, Package, Star,
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  'shopping-cart': ShoppingCart,
  'shopping_cart': ShoppingCart,
  'shoppingcart': ShoppingCart,
  'circle': Circle,
  'wifi': Wifi,
  'shield-check': ShieldCheck,
  'shield_check': ShieldCheck,
  'shieldcheck': ShieldCheck,
  'key': Key,
  'utensils-crossed': UtensilsCrossed,
  'utensils_crossed': UtensilsCrossed,
  'utensilscrossed': UtensilsCrossed,
  'car': Car,
  'heart': Heart,
  'book-open': BookOpen,
  'book_open': BookOpen,
  'bookopen': BookOpen,
  'music': Music,
  'zap': Zap,
  'shopping-bag': ShoppingBag,
  'shopping_bag': ShoppingBag,
  'shoppingbag': ShoppingBag,
  'credit-card': CreditCard,
  'credit_card': CreditCard,
  'creditcard': CreditCard,
  'home': Home,
  'briefcase': Briefcase,
  'code': Code,
  'trending-up': TrendingUp,
  'trending_up': TrendingUp,
  'trendingup': TrendingUp,
  'gift': Gift,
  'more-horizontal': MoreHorizontal,
  'more_horizontal': MoreHorizontal,
  'morehorizontal': MoreHorizontal,
  'dollar-sign': DollarSign,
  'dollar_sign': DollarSign,
  'dollarsign': DollarSign,
  'banknote': Banknote,
  'piggy-bank': PiggyBank,
  'piggy_bank': PiggyBank,
  'piggybank': PiggyBank,
  'plane': Plane,
  'coffee': Coffee,
  'dumbbell': Dumbbell,
  'shirt': Shirt,
  'tv': Tv,
  'phone': Phone,
  'globe': Globe,
  'package': Package,
  'star': Star,
}

interface CategoryIconProps extends LucideProps {
  name: string | null | undefined
  fallback?: React.ComponentType<LucideProps>
}

export function CategoryIcon({ name, fallback: Fallback = MoreHorizontal, ...props }: CategoryIconProps) {
  if (!name) return <Fallback {...props} />
  const key = name.toLowerCase().replace(/\s+/g, '-')
  const Icon = iconMap[key] ?? iconMap[name.toLowerCase()] ?? Fallback
  return <Icon {...props} />
}
