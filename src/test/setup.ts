import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
    this.querySelector<HTMLElement>('button')?.focus()
  }

  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    this.open = false

    if (returnValue !== undefined) {
      this.returnValue = returnValue
    }

    this.dispatchEvent(new Event('close'))
  }
}

afterEach(cleanup)
