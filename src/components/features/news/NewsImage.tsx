import { useState, useRef, useEffect } from "react";
import { 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Flame, 
  Droplets, 
  Shield, 
  Lock, 
  Zap, 
  Heart, 
  DollarSign, 
  Building2, 
  AlertTriangle, 
  Globe,
  Newspaper
} from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "weather" | "security" | "health" | "infrastructure" | "financial" | "regulatory" | "cyber" | "supply_chain" | "environmental" | "general";

interface NewsImageProps {
  imageUrl?: string | null;
  category: Category;
  title: string;
  keywords?: string[];
  className?: string;
}

// Category-to-icon mapping with subcategory detection
function getCategoryIcon(category: Category, title: string) {
  const lowerTitle = title.toLowerCase();
  
  if (category === "weather") {
    if (/fire|wildfire|blaze|burn/i.test(lowerTitle)) return Flame;
    if (/flood|rain|water/i.test(lowerTitle)) return Droplets;
    if (/snow|blizzard|ice|freeze/i.test(lowerTitle)) return CloudSnow;
    if (/storm|hurricane|tornado/i.test(lowerTitle)) return CloudRain;
    if (/wind|gust/i.test(lowerTitle)) return Wind;
    return Cloud;
  }
  
  const categoryIcons: Record<Category, typeof Cloud> = {
    weather: Cloud,
    security: /cyber|hack|breach|data/i.test(lowerTitle) ? Lock : Shield,
    health: Heart,
    infrastructure: /power|electric|outage/i.test(lowerTitle) ? Zap : Building2,
    financial: DollarSign,
    regulatory: Shield,
    cyber: Lock,
    supply_chain: Building2,
    environmental: Droplets,
    general: Globe,
  };
  
  return categoryIcons[category] || Globe;
}

// Category-to-color mapping for icon fallback backgrounds
const categoryColors: Record<Category, { bg: string; icon: string }> = {
  weather: { bg: "bg-sky-100 dark:bg-sky-900/40", icon: "text-sky-600 dark:text-sky-400" },
  security: { bg: "bg-red-100 dark:bg-red-900/40", icon: "text-red-600 dark:text-red-400" },
  health: { bg: "bg-pink-100 dark:bg-pink-900/40", icon: "text-pink-600 dark:text-pink-400" },
  infrastructure: { bg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600 dark:text-amber-400" },
  financial: { bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600 dark:text-emerald-400" },
  regulatory: { bg: "bg-purple-100 dark:bg-purple-900/40", icon: "text-purple-600 dark:text-purple-400" },
  cyber: { bg: "bg-indigo-100 dark:bg-indigo-900/40", icon: "text-indigo-600 dark:text-indigo-400" },
  supply_chain: { bg: "bg-orange-100 dark:bg-orange-900/40", icon: "text-orange-600 dark:text-orange-400" },
  environmental: { bg: "bg-green-100 dark:bg-green-900/40", icon: "text-green-600 dark:text-green-400" },
  general: { bg: "bg-slate-100 dark:bg-slate-800/40", icon: "text-slate-600 dark:text-slate-400" },
};

export function NewsImage({ imageUrl, category, title, className }: NewsImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  // Lazy loading with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px", threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  const hasValidImage = imageUrl && !imageError;
  const Icon = getCategoryIcon(category, title);
  const colors = categoryColors[category] || categoryColors.general;

  return (
    <div 
      ref={imgRef}
      className={cn(
        "w-20 h-[60px] rounded-md overflow-hidden flex-shrink-0 relative",
        !hasValidImage && colors.bg,
        className
      )}
    >
      {hasValidImage && isInView ? (
        <>
          {/* Placeholder while loading */}
          {!imageLoaded && (
            <div className={cn("absolute inset-0 flex items-center justify-center", colors.bg)}>
              <Newspaper className={cn("h-5 w-5 animate-pulse", colors.icon)} />
            </div>
          )}
          <img
            src={imageUrl}
            alt=""
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
          />
        </>
      ) : (
        // Fallback: Category icon
        <div className="w-full h-full flex items-center justify-center">
          <Icon className={cn("h-6 w-6", colors.icon)} />
        </div>
      )}
    </div>
  );
}
