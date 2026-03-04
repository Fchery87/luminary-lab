import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ComparisonSliderV2Props {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: number;
  vertical?: boolean;
}

export function ComparisonSliderV2({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "Processed",
  className,
  aspectRatio = 16 / 9,
  vertical = false,
}: ComparisonSliderV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(50);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);

  // Motion values for smooth animation
  const motionPosition = useMotionValue(50);
  const springPosition = useSpring(motionPosition, {
    stiffness: 300,
    damping: 30,
    mass: 0.5,
  });

  // Transform for clip path
  const clipTransform = useTransform(
    springPosition,
    (v) => (vertical ? `inset(${v}% 0 0 0)` : `inset(0 ${100 - v}% 0 0)`)
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let percentage: number;

      if (vertical) {
        percentage = ((clientY - rect.top) / rect.height) * 100;
      } else {
        percentage = ((clientX - rect.left) / rect.width) * 100;
      }

      const clamped = Math.max(0, Math.min(100, percentage));
      setPosition(clamped);
      motionPosition.set(clamped);
    },
    [vertical, motionPosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY);
      }
    },
    [isDragging, handleMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    [handleMove]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isKeyboardFocused) return;

      switch (e.key) {
        case vertical ? "ArrowUp" : "ArrowLeft":
          e.preventDefault();
          setPosition((p) => {
            const newPos = Math.max(0, p - (e.shiftKey ? 1 : 5));
            motionPosition.set(newPos);
            return newPos;
          });
          break;
        case vertical ? "ArrowDown" : "ArrowRight":
          e.preventDefault();
          setPosition((p) => {
            const newPos = Math.min(100, p + (e.shiftKey ? 1 : 5));
            motionPosition.set(newPos);
            return newPos;
          });
          break;
        case "Home":
          e.preventDefault();
          setPosition(0);
          motionPosition.set(0);
          break;
        case "End":
          e.preventDefault();
          setPosition(100);
          motionPosition.set(100);
          break;
        case "c":
        case "C":
          e.preventDefault();
          setPosition(50);
          motionPosition.set(50);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isKeyboardFocused, vertical, motionPosition]);

  // Touch action style based on orientation
  const touchActionStyle = vertical ? "pan-x" : "pan-y";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-black select-none touch-none",
        className
      )}
      style={{
        aspectRatio,
        touchAction: touchActionStyle,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
    >
      {/* After image (full size) */}
      <Image
        src={afterImage}
        alt={afterLabel}
        fill
        className="object-contain"
        draggable={false}
        priority
        sizes="(max-width: 768px) 100vw, 80vw"
      />

      {/* Before image (clipped) */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: clipTransform }}
      >
        <Image
          src={beforeImage}
          alt={beforeLabel}
          fill
          className="object-contain"
          draggable={false}
          priority
          sizes="(max-width: 768px) 100vw, 80vw"
        />
      </motion.div>

      {/* Slider handle */}
      <motion.div
        role="slider"
        aria-label={vertical ? "Vertical comparison divider" : "Comparison divider"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-orientation={vertical ? "vertical" : "horizontal"}
        tabIndex={0}
        className={cn(
          "absolute bg-white cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          vertical
            ? "left-0 right-0 h-1 cursor-row-resize"
            : "top-0 bottom-0 w-1 cursor-ew-resize"
        )}
        style={
          vertical
            ? { top: springPosition.get() + "%", y: "-50%" }
            : { left: springPosition.get() + "%", x: "-50%" }
        }
        onMouseDown={() => setIsDragging(true)}
        onFocus={() => setIsKeyboardFocused(true)}
        onBlur={() => setIsKeyboardFocused(false)}
        whileHover={{ scale: vertical ? 1.5 : 1.5 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Handle knob */}
        <motion.div
          className={cn(
            "absolute bg-white rounded-full shadow-lg flex items-center justify-center",
            vertical
              ? "left-1/2 -translate-x-1/2 w-10 h-10 -translate-y-1/2"
              : "top-1/2 -translate-y-1/2 w-10 h-10 -translate-x-1/2"
          )}
          initial={false}
          animate={{ scale: isDragging ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {vertical ? (
            <div className="flex flex-col gap-0.5">
              <ChevronLeft className="w-4 h-4 text-gray-600 -rotate-90" />
              <ChevronRight className="w-4 h-4 text-gray-600 -rotate-90" />
            </div>
          ) : (
            <div className="flex gap-0.5">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </div>
          )}
        </motion.div>

        {/* Progress indicator */}
        <div
          className={cn(
            "absolute bg-primary/20",
            vertical
              ? "left-0 right-0 h-full"
              : "top-0 bottom-0 w-full"
          )}
        />
      </motion.div>

      {/* Labels */}
      <div
        className={cn(
          "absolute px-3 py-1.5 bg-black/60 text-white text-sm rounded backdrop-blur-sm font-medium",
          vertical ? "top-4 left-1/2 -translate-x-1/2" : "top-4 left-4"
        )}
      >
        {beforeLabel}
      </div>
      <div
        className={cn(
          "absolute px-3 py-1.5 bg-black/60 text-white text-sm rounded backdrop-blur-sm font-medium",
          vertical ? "bottom-4 left-1/2 -translate-x-1/2" : "top-4 right-4"
        )}
      >
        {afterLabel}
      </div>

      {/* Position indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/60 text-white text-xs rounded backdrop-blur-sm">
        {Math.round(position)}%
      </div>
    </div>
  );
}

// Hook to detect portrait orientation
export function usePortraitOrientation() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return isPortrait;
}

// Responsive comparison slider that switches to vertical on mobile
export function ResponsiveComparisonSlider(
  props: Omit<ComparisonSliderV2Props, "vertical">
) {
  const isPortrait = usePortraitOrientation();

  return <ComparisonSliderV2 {...props} vertical={isPortrait} />;
}

export default ComparisonSliderV2;
