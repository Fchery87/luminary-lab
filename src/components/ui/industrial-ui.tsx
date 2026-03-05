"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IndustrialCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accent?: boolean;
  glow?: boolean;
  id?: string;
  onClick?: () => void;
}

export function IndustrialCard({
  children,
  className = "",
  hover = false,
  accent = false,
  glow = false,
  id,
  onClick,
}: IndustrialCardProps) {
  return (
    <motion.div
      id={id}
      onClick={onClick}
      className={cn(
        "relative bg-[hsl(var(--card))] border border-[hsl(var(--border))]",
        hover && "hover:border-[hsl(var(--gold))] transition-colors duration-300",
        accent && "border-[hsl(var(--gold))]/30",
        glow && "amber-glow",
        onClick && "cursor-pointer",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top accent line */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-[1px]",
          accent 
            ? "bg-[hsl(var(--gold))]" 
            : "bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold-light))] to-transparent opacity-50"
        )} 
      />
      {/* Corner accent */}
      {accent && (
        <div className="absolute -top-[1px] -left-[1px] w-8 h-8 border-t-2 border-l-2 border-[hsl(var(--gold))]" />
      )}
      <div className="relative h-full w-full">{children}</div>
    </motion.div>
  );
}

interface FrameProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}

export function Frame({ children, className = "", accent = false }: FrameProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 border border-[hsl(var(--border))]" />
      {accent && (
        <div className="absolute -top-[1px] -left-[1px] w-8 h-8 border-t-2 border-l-2 border-[hsl(var(--gold))]" />
      )}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

interface AmberButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function AmberButton({
  children,
  variant = "primary",
  size = "md",
  href,
  icon,
  className = "",
  onClick,
  disabled,
  type = "button",
}: AmberButtonProps) {
  const baseClasses = "relative overflow-hidden font-display font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-[hsl(var(--gold))] text-[hsl(var(--charcoal))] hover:bg-[hsl(var(--gold-light))] shadow-lg shadow-[hsl(var(--gold))]/20",
    secondary: "bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--gold))] hover:text-[hsl(var(--gold))]",
    ghost: "bg-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--gold))]",
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-[10px] rounded-sm",
    md: "px-4 py-2 text-xs rounded-sm",
    lg: "px-6 py-3 text-sm rounded-sm",
  };

  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </>
  );

  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={classes}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={classes}
    >
      {content}
    </motion.button>
  );
}

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({ label, title, description, className = "" }: SectionHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {label && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-[1px] bg-[hsl(var(--gold))]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
            {label}
          </span>
          <div className="w-6 h-[1px] bg-[hsl(var(--gold))]" />
        </div>
      )}
      <h2 className="font-display font-bold text-xl text-[hsl(var(--foreground))]">
        {title}
      </h2>
      {description && (
        <p className="font-body text-xs text-[hsl(var(--muted-foreground))] mt-1">
          {description}
        </p>
      )}
    </div>
  );
}

interface ControlGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function ControlGroup({ label, children, className = "" }: ControlGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </label>
      {children}
    </div>
  );
}

interface DataLabelProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function DataLabel({ label, value, mono = true }: DataLabelProps) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className={cn(
        "text-[hsl(var(--foreground))]",
        mono && "font-mono text-[hsl(var(--gold))]"
      )}>
        {value}
      </span>
    </div>
  );
}

interface StatusBadgeProps {
  status: "idle" | "processing" | "complete" | "error";
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusClasses = {
    idle: "bg-secondary/50 text-muted-foreground border-border",
    processing: "bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/30 animate-pulse",
    complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <span className={cn(
      "px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded-sm",
      statusClasses[status]
    )}>
      {children}
    </span>
  );
}

interface MetricDisplayProps {
  label: string;
  value: string;
  unit?: string;
}

export function MetricDisplay({ label, value, unit }: MetricDisplayProps) {
  return (
    <div className="text-center">
      <div className="font-mono text-lg font-medium text-[hsl(var(--gold))]">
        {value}
        {unit && <span className="text-sm text-[hsl(var(--foreground))] ml-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-display">
        {label}
      </div>
    </div>
  );
}
