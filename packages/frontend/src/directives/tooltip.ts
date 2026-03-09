import type { Directive } from 'vue'

const TOOLTIP_DELAY = 200

declare global {
  interface HTMLElement {
    _tooltipCleanup?: () => void
  }
}

export const vTooltip: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const text = binding.value
    if (! text) return

    // Set aria-label
    el.setAttribute('aria-label', text)

    let tooltipEl: HTMLElement | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const showTooltip = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (tooltipEl) return

        tooltipEl = document.createElement('span')
        tooltipEl.className = 'tooltip'
        tooltipEl.textContent = text
        
        // Ensure parent has position context
        const computedStyle = window.getComputedStyle(el)
        if (computedStyle.position === 'static') {
          el.style.position = 'relative'
        }
        
        el.appendChild(tooltipEl)
      }, TOOLTIP_DELAY)
    }

    const hideTooltip = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (tooltipEl) {
        tooltipEl.remove()
        tooltipEl = null
      }
    }

    el.addEventListener('mouseenter', showTooltip)
    el.addEventListener('mouseleave', hideTooltip)

    // Store cleanup function
    el._tooltipCleanup = () => {
      hideTooltip()
      el.removeEventListener('mouseenter', showTooltip)
      el.removeEventListener('mouseleave', hideTooltip)
    }
  },

  unmounted(el) {
    el._tooltipCleanup?.()
  }
}
