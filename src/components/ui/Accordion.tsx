import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type AccordionItem = {
  title: React.ReactNode | ((isActive: boolean) => React.ReactNode);
  content: React.ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  multiple?: boolean;
  defaultIndex?: number | number[];
  className?: string;
};

export default function Accordion({
  items,
  multiple = false,
  defaultIndex = -1,
  className,
}: AccordionProps) {
  const initial = multiple
    ? Array.isArray(defaultIndex)
      ? (defaultIndex as number[])
      : typeof defaultIndex === "number" && defaultIndex >= 0
      ? [defaultIndex as number]
      : []
    : typeof defaultIndex === "number"
    ? (defaultIndex as number)
    : -1;

  const [activeIndex, setActiveIndex] = useState<number | number[]>(initial);

  const handleToggle = (index: number) => {
    setActiveIndex((prev) => {
      if (multiple) {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.includes(index)
          ? arr.filter((i) => i !== index)
          : [...arr, index];
      }
      return (prev as number) === index ? -1 : index;
    });
  };

  const isItemActive = (index: number) =>
    multiple
      ? Array.isArray(activeIndex) && activeIndex.includes(index)
      : (activeIndex as number) === index;

  return (
    <div className={className ?? "Accordion"}>
      {items.map((item, index) => {
        const isActive = isItemActive(index);
        const header =
          typeof item.title === "function" ? item.title(isActive) : item.title;

        return (
          <div key={index} className="AccordionItem">
            <motion.div
              className={`AccordionHeader ${isActive ? "active" : ""}`}
              onClick={() => handleToggle(index)}
            >
              {header}
            </motion.div>

            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                >
                  <div className="AccordionPanel">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
