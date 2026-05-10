"use client";

import {
  motion,
  useInView,
  type Variants,
  type MotionProps,
} from "framer-motion";
import { type RefObject, type ElementType, type ReactNode } from "react";

interface TimelineContentProps extends MotionProps {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  animationNum: number;
  timelineRef: RefObject<HTMLElement | null>;
  customVariants: Variants;
  once?: boolean;
}

export function TimelineContent({
  as: Tag = "div",
  children,
  className,
  animationNum,
  timelineRef,
  customVariants,
  once = true,
  ...rest
}: TimelineContentProps) {
  const inView = useInView(timelineRef, { once, amount: 0.05 });
  const MotionTag = motion(Tag);
  return (
    <MotionTag
      className={className}
      custom={animationNum}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={customVariants}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
