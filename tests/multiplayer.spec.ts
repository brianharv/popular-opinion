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
    const start = host.getByRole('button', { name: 'Start game' })
    const lobby = host.locator('.waiting-room')
    await expect(start).toBeDisabled()
    await expect(start).toHaveAccessibleDescription('The game can start once enough players have joined.')
    await expect(host.getByText('Players needed: 3')).toBeVisible()
    const initialLobbyHeight = await lobby.evaluate(card => card.getBoundingClientRect().height)
    await contexts[0].grantPermissions(['clipboard-read', 'clipboard-write'])
    const copyCode = host.getByRole('button', { name: 'Copy room code' })
    await expect(copyCode.locator('svg rect')).toHaveCount(1)
    await copyCode.click()
    await expect(copyCode).toHaveCSS('background-color', 'rgb(28, 79, 134)')
    await expect(copyCode.locator('svg rect')).toHaveCount(0)
    await expect(copyCode.locator('svg path')).toHaveAttribute('d', 'm5 12 4 4L19 6')
    expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(code)
    for (const [index, page] of pages.slice(1).entries()) {
      await page.getByRole('button', { name: 'Join Game' }).click()
      await page.getByLabel('Room code').fill(code)
      await page.getByLabel('Screen name').fill(`Player ${index + 2}`)
      await page.getByRole('button', { name: 'Join room' }).click()
      await expect(page.getByRole('heading', { name: 'Waiting room' })).toBeVisible()
      await expect(host.getByText(`Players needed: ${2 - index}`)).toBeVisible()
    }
    await expect(start).toBeEnabled()
    expect(await lobby.evaluate(card => card.getBoundingClientRect().height)).toBe(initialLobbyHeight)
    await host.getByLabel('Game type').selectOption('points')
    await host.getByLabel('Point target').selectOption('100')
    await host.getByRole('button', { name: 'Start game' }).click()
    await expect(host.getByText('First to 100 points · Turn 1')).toBeVisible()
    await expect.poll(() => frames.every(messages => messages.some(message => message.includes('"phase":"answering"')))).toBe(true)
    const answererIndex = frames.findIndex(messages => messages.some(message => message.includes('The Troll')))
    expect(answererIndex).toBeGreaterThanOrEqual(0)
    const answerer = pages[answererIndex]
    const [challenger, other, supporter] = pages.filter(page => page !== answerer)
    await answerer.getByLabel('Your answer').fill('Paris')
    await answerer.getByLabel('Your answer').press('Enter')
    await expect(answerer.getByLabel('Your answer')).toHaveValue('')
    await expect(answerer.getByText('Last accepted: Paris')).toBeVisible()
    await answerer.reload()
    await expect(answerer.getByText('Last accepted: Paris')).toBeVisible()
    await expect(answerer.getByLabel('Your answer')).toHaveValue('')
    await answerer.getByLabel('Your answer').fill('Rome')

    await expect(challenger.getByText('Get ready')).toBeVisible({ timeout: 7000 })
    await expect(challenger.getByText('Paris')).toHaveCount(0)
    await expect(challenger.getByText('Paris')).toBeVisible()
    const longAnswer = 'Berlin'.repeat(24)
    await Promise.all([[challenger, 'Oslo'], [other, longAnswer]].map(async ([page, text]) => {
      const player = page as typeof challenger
      await player.getByLabel('Challenge', { exact: true }).check()
      await player.getByLabel('Challenge answer').fill(text as string)
      await player.getByLabel('Challenge answer').press('Enter')
      await expect(player.getByLabel('Challenge answer')).toHaveValue('')
      await expect(player.getByText(`Last accepted: ${text}`)).toBeVisible()
    }))
    await supporter.getByRole('radio', { name: 'Support', exact: true }).press('Enter')
    await expect(supporter.getByText('Last accepted: Support')).toBeVisible()
    await supporter.getByRole('button', { name: 'Vote for Oslo' }).click({ timeout: 7000 })
    const selectedVote = supporter.getByRole('button', { name: 'Vote for Oslo' })
    await expect(selectedVote).toHaveAttribute('aria-pressed', 'true')
    await expect(selectedVote).toHaveText('✓')
    const otherVote = supporter.getByRole('button', { name: `Vote for ${longAnswer}` })
    const layout = await otherVote.evaluate(button => {
      const row = button.parentElement!
      const answer = row.firstElementChild!
      const widths = [...row.parentElement!.querySelectorAll('button')].map(item => item.getBoundingClientRect().width)
      return {
        answerRatio: answer.getBoundingClientRect().width / row.getBoundingClientRect().width,
        textHeight: answer.getBoundingClientRect().height,
        buttonHeight: button.getBoundingClientRect().height,
        widths,
      }
    })
    expect(layout.answerRatio).toBeLessThanOrEqual(0.75)
    expect(layout.textHeight).toBeGreaterThan(layout.buttonHeight)
    expect(new Set(layout.widths).size).toBe(1)
    await supporter.reload()
    await expect(selectedVote).toHaveAttribute('aria-pressed', 'true')
    await expect(selectedVote).toHaveText('✓')

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
      await expect(page.getByText('First to 100 points · Turn 2')).toBeVisible()
    }))
    await expect(answerer.getByLabel('Your answer')).toHaveCount(0)
    await expect.poll(async () => {
      const inputs = await Promise.all(pages.map(page => page.getByLabel('Your answer').count()))
      return inputs.reduce((total, count) => total + count, 0)
    }).toBe(1)
    const results = frames.map(messages => messages.map(raw => JSON.parse(raw) as ServerMessage)
      .flatMap(message => 'view' in message && message.view.result ? [message.view.result] : [])[0])
    for (const result of results) expect(result).toEqual(results[0])
  } finally {
    await Promise.all(contexts.map(context => context.close()))
  }
})

test('the waiting room reserves space for all twelve seats', async ({ page, request }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Create Game' }).click()
  await page.getByLabel('Screen name').fill('Host')
  await page.getByRole('button', { name: 'Create room' }).click()
  const lobby = page.locator('.waiting-room')
  const roster = page.getByRole('list', { name: 'Players' })
  const seats = roster.getByRole('listitem')
  await expect(seats).toHaveCount(1)
  const code = page.url().split('/').at(-1)
  const initialHeight = await lobby.evaluate(card => card.getBoundingClientRect().height)
  const join = (name: string) => request.post(`/api/rooms/${code}/join`, { data: { name } })
  for (let seat = 2; seat <= 12; seat += 1) {
    expect((await join(`Player ${seat}`)).ok()).toBe(true)
    await expect(seats).toHaveCount(seat)
    expect(await lobby.evaluate(card => card.getBoundingClientRect().height)).toBe(initialHeight)
  }
  expect((await join('Player 13')).status()).toBe(409)
  await expect(seats.last()).toBeInViewport({ ratio: 1 })
})
