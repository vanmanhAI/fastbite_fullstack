"use client"

export default function LoadingSpinner({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "w-5 h-5 border-2",
    medium: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4"
  }

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} border-t-primary animate-spin rounded-full`}></div>
    </div>
  )
} 