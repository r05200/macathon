import { useState, useEffect, useRef } from "react"

type CyberTitleProps = {
  text: string
  as?: "h1" | "h2" | "h3"
  className?: string
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"

export default function CyberTitle({ text, as: Tag = "h2", className = "" }: CyberTitleProps) {
  const [displayText, setDisplayText] = useState(text.split("").map(() => CHARS[Math.floor(Math.random() * CHARS.length)]).join(""))

  useEffect(() => {
    const totalSteps = text.length * 3
    const stepDuration = 25

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++

      const newText = text.split("").map((char, i) => {
        const decodeAtStep = 5 + (i * 2)
        
        if (currentStep >= decodeAtStep) {
          return text[i]
        }
        return CHARS[Math.floor(Math.random() * CHARS.length)]
      }).join("")

      setDisplayText(newText)

      if (currentStep >= totalSteps) {
        clearInterval(interval)
        setDisplayText(text)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [text])

  return (
    <Tag className={`font-mono tracking-wider ${className}`}>
      {displayText.split("").map((char, i) => (
        <span
          key={i}
          className={char !== text[i] ? "text-[var(--cyber-accent)] glow-pulse" : ""}
        >
          {char}
        </span>
      ))}
    </Tag>
  )
}
