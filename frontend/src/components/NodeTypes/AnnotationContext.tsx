import { createContext, useContext } from 'react'

type AnnotationClickHandler = (nodeId: string, event: React.MouseEvent) => void

// eslint-disable-next-line react-refresh/only-export-components
export const AnnotationContext = createContext<AnnotationClickHandler | undefined>(undefined)

export function AnnotationProvider({ onAnnotationClick, children }: { onAnnotationClick: AnnotationClickHandler; children: React.ReactNode }) {
  return (
    <AnnotationContext.Provider value={onAnnotationClick}>
      {children}
    </AnnotationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnnotationClick(): AnnotationClickHandler | undefined {
  return useContext(AnnotationContext)
}
