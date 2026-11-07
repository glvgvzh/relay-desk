import { useEffect, useEffectEvent, useReducer, useState } from 'react'

type AsyncData<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error }

type Action<T> = { type: 'loading' } | { type: 'success'; data: T } | { type: 'error'; error: Error }

function reducer<T>(_state: AsyncData<T>, action: Action<T>): AsyncData<T> {
  if (action.type === 'success') return { status: 'success', data: action.data, error: null }
  if (action.type === 'error') return { status: 'error', data: null, error: action.error }
  return { status: 'loading', data: null, error: null }
}

export function useAsyncData<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencyKey: string,
): AsyncData<T> & { retry: () => void } {
  const [state, dispatch] = useReducer(reducer<T>, { status: 'loading', data: null, error: null })
  const load = useEffectEvent(loader)
  const [retryCount, setRetryCount] = useState(0)

  function retry() {
    setRetryCount((prev) => prev + 1)
  }

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'loading' })

    load(controller.signal)
      .then((data) => dispatch({ type: 'success', data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        dispatch({ type: 'error', error: error instanceof Error ? error : new Error('Неизвестная ошибка') })
      })

    return () => controller.abort()
  }, [dependencyKey, retryCount])

  return { ...state, retry }
}
