"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SimpleDropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

export function SimpleDropdown({ trigger, children, align = "end", className }: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1 w-48 bg-white border rounded-md shadow-lg z-50",
            align === "start" && "left-0",
            align === "center" && "left-1/2 transform -translate-x-1/2",
            align === "end" && "right-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface SimpleDropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function SimpleDropdownItem({ children, onClick, disabled, className }: SimpleDropdownItemProps) {
  return (
    <div
      className={cn(
        "px-3 py-2 text-sm cursor-pointer hover:bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  )
}
