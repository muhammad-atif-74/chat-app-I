import type { ReactNode } from "react"

type FormattedResponseProps = {
  content: string
}

function formatInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return <span key={index}>{part}</span>
  })
}

export function FormattedResponse({ content }: FormattedResponseProps) {
  const lines = content.trim().split("\n")
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  let numbers: string[] = []

  const flushLists = () => {
    if (bullets.length) {
      blocks.push(
        <ul className="my-2 list-disc space-y-1 pl-5" key={`bullets-${blocks.length}`}>
          {bullets.map((item, index) => <li key={index}>{formatInline(item)}</li>)}
        </ul>,
      )
      bullets = []
    }
    if (numbers.length) {
      blocks.push(
        <ol className="my-2 list-decimal space-y-1 pl-5" key={`numbers-${blocks.length}`}>
          {numbers.map((item, index) => <li key={index}>{formatInline(item)}</li>)}
        </ol>,
      )
      numbers = []
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushLists()
    } else if (/^[-*_]{3,}$/.test(trimmed)) {
      flushLists()
      blocks.push(<hr className="my-3 border-zinc-200" key={`rule-${index}`} />)
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (numbers.length) flushLists()
      bullets.push(trimmed.replace(/^[-*]\s+/, ""))
    } else if (/^\d+\.\s+/.test(trimmed)) {
      if (bullets.length) flushLists()
      numbers.push(trimmed.replace(/^\d+\.\s+/, ""))
    } else if (/^#{1,6}\s+/.test(trimmed)) {
      flushLists()
      const level = trimmed.match(/^#+/)?.[0].length ?? 3
      const heading = formatInline(trimmed.replace(/^#{1,6}\s+/, ""))
      const className = level <= 3
        ? "mb-2 mt-4 text-base font-semibold text-zinc-900 first:mt-0"
        : "mb-1 mt-3 text-sm font-semibold text-zinc-900 first:mt-0"
      blocks.push(<h3 className={className} key={`heading-${index}`}>{heading}</h3>)
    } else {
      flushLists()
      blocks.push(<p className="my-2 first:mt-0 last:mb-0" key={`paragraph-${index}`}>{formatInline(trimmed)}</p>)
    }
  })
  flushLists()

  return <div>{blocks}</div>
}
