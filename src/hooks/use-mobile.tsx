import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}

export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Check for touch support
    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 || 
                     (navigator as any).msMaxTouchPoints > 0

    setIsTouchDevice(hasTouch)
  }, [])

  return isTouchDevice
}

export function useDeviceType() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isTouchDevice = useIsTouchDevice()

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isTouchDevice,
    isMobileOrTablet: isMobile || isTablet
  }
}
