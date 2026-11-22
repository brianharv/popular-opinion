import { expect, test } from '@playwright/test'
import type { ServerMessage } from '../shared/protocol'

test('four seats reconnect, keep the Modifier private, and share committed scoring', async ({ browser, baseURL }) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  })))
  try {
    const pages = await Promise.all(contexts.map(context => context.newPage()))
    const frames: string[][] = pages.map(() => [])
    for (const [index, page] of pages.entries()) {
      page.on('websocket', socket => socket.on('framereceived', ({ payload }) => frames[index].push(payload.toString())))
      await page.goto('/')
    }
    const [host] = pages
    await host.getByRole('button', { name: 'Create Game' }).click()
    await host.getByLabel('Screen name').fill('Player 1')
    await host.getByRole('button', { name: 'Create room' }).click()
    await expect(host).toHaveURL(/\/room\/[A-F0-9]{8}$/)
    const code = host.url().split('/').at(-1)!
    await Promise.all(pages.slice(1).map(async (page, index) => {
      await page.getByRole('button', { name: 'Join Game' }).click()
      await page.getByLabel('Room code').fill(code)
      await page.getByLabel('Screen name').fill(`Player ${index + 2}`)
      await page.getByRole('button', { name: 'Join room' }).click()
      await expect(page.getByRole('heading', { name: 'Waiting room' })).toBeVisible()
    }))
    await host.getByRole('button', { name: 'Start turn' }).click()
    await expect.poll(() => frames.every(messages => messages.some(message => message.includes('"phase":"answering"')))).toBe(true)
    const answererIndex = frames.findIndex(messages => messages.some(message => message.includes('The Troll')))
    expect(answererIndex).toBeGreaterThanOrEqual(0)
    const answerer = pages[answererIndex]
    const [challenger, other, supporter] = pages.filter(page => page !== answerer)
    await answerer.getByLabel('Your answer').fill('Paris')
    await answerer.getByRole('button', { name: 'Submit answer' }).click()
    await expect(answerer.getByText('Last accepted: Paris')).toBeVisible()
    await answerer.reload()
    await expect(answerer.getByText('Last accepted: Paris')).toBeVisible()
    await answerer.getByLabel('Your answer').fill('Rome')

    await expect(challenger.getByText('Get ready')).toBeVisible({ timeout: 7000 })
    await expect(challenger.getByText('Paris')).toHaveCount(0)
    await expect(challenger.getByText('Paris')).toBeVisible()
    await Promise.all([[challenger, 'Oslo'], [other, 'Berlin']].map(async ([page, text]) => {
      const player = page as typeof challenger
      await player.getByLabel('Challenge', { exact: true }).check()
      await player.getByLabel('Challenge answer').fill(text as string)
      await player.getByRole('button', { name: 'Submit response' }).click()
      await expect(player.getByText(`Last accepted: ${text}`)).toBeVisible()
    }))
    await supporter.getByRole('button', { name: 'Submit response' }).click()
    await expect(supporter.getByText('Last accepted: Support')).toBeVisible()
    await supporter.getByRole('button', { name: 'Vote for Oslo' }).click({ timeout: 7000 })
    await expect(supporter.getByRole('button', { name: 'Vote for Oslo' })).toHaveText('Your vote')
    await supporter.reload()
    await expect(supporter.getByRole('button', { name: 'Vote for Oslo' })).toHaveText('Your vote')

    for (const [index, messages] of frames.entries()) {
      if (index === answererIndex) continue
      const preScoreFrames = messages.filter(raw => !raw.includes('"result"'))
      expect(preScoreFrames.every(raw => !raw.includes('The Troll'))).toBe(true)
      const privateViews = messages.map(raw => JSON.parse(raw) as ServerMessage)
        .flatMap(message => 'view' in message && !message.view.result ? [message.view] : [])
      expect(privateViews.every(view => view.modifier === undefined)).toBe(true)
      if (pages[index] !== supporter) expect(privateViews.every(view => view.vote === undefined)).toBe(true)
    }
    await Promise.all(pages.map(async page => {
      await expect(page.getByText('The Troll')).toBeVisible({ timeout: 7000 })
      await expect(page.getByText('9 pts')).toBeVisible()
      await expect(page.getByText('You', { exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible()
    }))
    const results = frames.map(messages => messages.map(raw => JSON.parse(raw) as ServerMessage)
      .flatMap(message => 'view' in message && message.view.result ? [message.view.result] : [])[0])
    for (const result of results) expect(result).toEqual(results[0])
  } finally {
    await Promise.all(contexts.map(context => context.close()))
  }
})
