import { useEffect, useState, useRef } from "react"

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*<>{}[]"

type CyberTitleProps = {
  text: string
  as?: "h1" | "h2" | "h3"
  className?: string
}

export default function CyberTitle({ text, as: Tag = "h2", className = "" }: CyberTitleProps) {
  const [display, setDisplay] = useState(text)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const target = text
    const duration = 600 // ms total
    const steps = 12
    const interval = duration / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = step / steps

      setDisplay(
        target
          .split("")
          .map((char, i) => {
            if (char === " ") return " "
            // Characters resolve left-to-right based on progress
            if (i / target.length < progress) return char
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join("")
      )

      if (step >= steps) {
        clearInterval(timer)
        setDisplay(target)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [text])

  return (
    <Tag className={`font-mono tracking-wide ${className}`}>
      {display.split("").map((char, i) => (
        <span
          key={i}
          className={char !== text[i] ? "text-[var(--cyber-accent)] opacity-70" : ""}
        >
          {char}
        </span>
      ))}
    </Tag>
  )
}
