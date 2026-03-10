import type { Directive } from 'vue'

const TOOLTIP_DELAY = 600

declare global {
  interface HTMLElement {
    _tooltipCleanup?: () => void
    _tooltipSetText?: (value: string | undefined | null) => void
  }
}

export const vTooltip: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    let text = ''

    let tooltipEl: HTMLElement | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const showTooltip = () => {
      if (! text) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (tooltipEl) return

        tooltipEl = document.createElement('span')
        tooltipEl.className = 'tooltip'
        tooltipEl.textContent = text

        const rect = el.getBoundingClientRect()
        const left = rect.left + rect.width / 2
        const top = rect.bottom + 2

        tooltipEl.style.left = `${left}px`
        tooltipEl.style.top = `${top}px`

        document.body.appendChild(tooltipEl)
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

    const setText = (value: string | undefined | null) => {
      text = value?.trim() ?? ''
      if (text) {
        el.setAttribute('aria-label', text)
      }
      else {
        el.removeAttribute('aria-label')
        hideTooltip()
      }

      if (tooltipEl) {
        tooltipEl.textContent = text
      }
    }

    el.addEventListener('mouseenter', showTooltip)
    el.addEventListener('mouseleave', hideTooltip)
    el._tooltipSetText = setText
    setText(binding.value)

    el._tooltipCleanup = () => {
      hideTooltip()
      el.removeEventListener('mouseenter', showTooltip)
      el.removeEventListener('mouseleave', hideTooltip)
      delete el._tooltipSetText
    }
  },

  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    el._tooltipSetText?.(binding.value)
  },

  unmounted(el) {
    el._tooltipCleanup?.()
  }
}
