import { describe, it, expect, vi } from 'vitest'
import { useAsyncData } from './useAsyncData'
import { renderHook, waitFor, act } from '@testing-library/react'

describe('useAsyncData', () => {
  it('повторяет загрузку после ошибки и сохраняет полученные данные', async () => {
    const mockedData = { id: 1, message: 'Успех' }
    const mockedLoader = vi.fn().mockRejectedValueOnce(new Error('Ошибка')).mockResolvedValue(mockedData)
    const result = renderHook(() => useAsyncData(mockedLoader, 'catalog'))
    await waitFor(() => {
      expect(result.result.current.status).toBe('error')
    })
    act(() => {
      result.result.current.retry()
    })
    await waitFor(() => {
      expect(result.result.current.status).toBe('success')
    })
    expect(mockedLoader).toHaveBeenCalledTimes(2)
    expect(result.result.current.data).toBe(mockedData)
  })

  it('повторяет загрузку после второй ошибки и сохраняет полученные данные', async () => {
    const mockedData = { id: 1, message: 'Успех' }
    const mockedLoader = vi
      .fn()
      .mockRejectedValueOnce(new Error('Ошибка 1'))
      .mockRejectedValueOnce(new Error('Ошибка 2'))
      .mockResolvedValue(mockedData)
    const result = renderHook(() => useAsyncData(mockedLoader, 'catalog'))
    await waitFor(() => {
      expect(result.result.current.status).toBe('error')
      expect(result.result.current.error?.message).toBe('Ошибка 1')
    })
    act(() => {
      result.result.current.retry()
    })
    await waitFor(() => {
      expect(result.result.current.status).toBe('error')
      expect(result.result.current.error?.message).toBe('Ошибка 2')
    })
    expect(mockedLoader).toHaveBeenCalledTimes(2)
    act(() => {
      result.result.current.retry()
    })
    await waitFor(() => {
      expect(result.result.current.status).toBe('success')
    })
    expect(mockedLoader).toHaveBeenCalledTimes(3)
    expect(result.result.current.data).toBe(mockedData)
  })

  it('показывает загрузку во время повторного запроса после ошибки', async () => {
    const mockedData = { id: 1, message: 'Успех' }
    let resolveRequest: (value: typeof mockedData) => void = () => {}
    const mockedLoader = vi
      .fn()
      .mockRejectedValueOnce(new Error('Ошибка'))
      .mockImplementation(() => {
        return new Promise((resolve) => {
          resolveRequest = resolve
        })
      })
    const result = renderHook(() => useAsyncData(mockedLoader, 'catalog'))
    await waitFor(() => {
      expect(result.result.current.status).toBe('error')
    })
    act(() => {
      result.result.current.retry()
    })
    expect(result.result.current.status).toBe('loading')
    act(() => {
      resolveRequest(mockedData)
    })
    await waitFor(() => {
      expect(result.result.current.status).toBe('success')
    })
    expect(mockedLoader).toHaveBeenCalledTimes(2)
    expect(result.result.current.data).toBe(mockedData)
  })
})
