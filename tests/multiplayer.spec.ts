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
