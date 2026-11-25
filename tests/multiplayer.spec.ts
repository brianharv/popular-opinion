import { expect, test } from '@playwright/test'
import type { ServerMessage } from '../shared/protocol'

test('four seats reconnect, keep the Persona private, and share committed scoring', async ({ browser, baseURL }) => {
  test.setTimeout(45_000)
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
    const headerBack = host.locator('.top').getByRole('link', { name: 'Back to home' })
    await expect(headerBack).toHaveText('←')
    await expect(start).toBeDisabled()
    await expect(start).toHaveAccessibleDescription('The game can start once enough players have joined.')
    await expect(host.getByText('Players needed: 3')).toBeVisible()
    const initialLobbyHeight = await lobby.evaluate(card => card.getBoundingClientRect().height)
    await contexts[0].grantPermissions(['clipboard-read', 'clipboard-write'])
    const copyCode = host.getByRole('button', { name: 'Copy room code' })
    await expect(copyCode.locator('svg rect')).toHaveCount(1)
    await copyCode.click()
    await expect(copyCode).toHaveCSS('background-color', 'rgb(210, 227, 200)')
    await expect(copyCode.locator('svg rect')).toHaveCount(0)
    await expect(copyCode.locator('svg path')).toHaveAttribute('d', 'm5 12 4 4L19 6')
    expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(code)
    for (const [index, page] of pages.slice(1).entries()) {
      await page.getByRole('button', { name: 'Join Game' }).click()
      await page.getByLabel('Room code').fill(code)
      if (index === 0) {
        const name = page.getByLabel('Screen name')
        await name.fill('pLaYeR 1')
        await page.getByRole('button', { name: 'Join room' }).click()
        await expect(name).toBeFocused()
        await expect(name).toHaveAttribute('aria-invalid', 'true')
        await expect(name).toHaveAccessibleDescription('That screen name is already in use. Choose a different name.')
        await expect(host.getByText('Players needed: 3')).toBeVisible()
      }
      await page.getByLabel('Screen name').fill(`Player ${index + 2}`)
      await page.getByRole('button', { name: 'Join room' }).click()
      await expect(page.getByRole('heading', { name: 'Lobby' })).toBeVisible()
      await expect(host.getByText(`Players needed: ${2 - index}`)).toBeVisible()
      if (index === 0) {
        await expect(page.getByText('Waiting for players to join.')).toBeVisible()
      }
    }
    for (const guest of pages.slice(1)) {
      await expect(guest.getByText('Waiting for Host to start the game.')).toBeVisible()
    }
    await expect(start).toBeEnabled()
    expect(await lobby.evaluate(card => card.getBoundingClientRect().height)).toBe(initialLobbyHeight)
    await host.getByLabel('Game type').selectOption('points')
    await host.getByLabel('Point target').selectOption('100')
    await host.getByRole('button', { name: 'Start game' }).click()
    const findAnswerer = () => frames.findIndex(messages => messages.some(raw => {
      const message = JSON.parse(raw) as ServerMessage
      return 'view' in message && message.view.phase === 'turn-intro' && message.view.you === message.view.answeringId
    }))
    await expect.poll(findAnswerer).toBeGreaterThanOrEqual(0)
    const answererIndex = findAnswerer()
    const answerer = pages[answererIndex]
    const [challenger, other, supporter] = pages.filter(page => page !== answerer)
    const promptHeading = answerer.getByRole('heading', { level: 1, name: /^“.+”$/ })
    const waiting = supporter.getByText('Please wait while they review the prompt and persona.')
    const opponentPrompt = supporter.getByRole('heading', { level: 1, name: /^“.+”$/ })
    await expect(answerer.getByRole('heading', { name: `It’s your turn, Player ${answererIndex + 1}` })).toBeVisible()
    await expect(answerer.getByText('The Troll', { exact: true })).toHaveCount(0)
    await expect(answerer.getByText('The Troll', { exact: true })).toBeVisible()
    await expect(waiting).toBeVisible()
    await expect(supporter.getByText('First to 100 points · Turn 1')).toHaveCount(0)
    await expect(supporter.getByRole('heading', { name: `Player ${answererIndex + 1}’s turn.` })).toBeVisible()
    await expect(supporter.getByRole('timer')).toHaveAccessibleName(/seconds remaining/)
    await expect(opponentPrompt).toHaveCount(0)
    await expect(promptHeading).toHaveCount(0)
    await expect(answerer.getByLabel('Your answer')).toHaveCount(0)
    await expect(promptHeading).toBeVisible()
    await expect(waiting).toBeVisible()
    await expect(opponentPrompt).toHaveCount(0)
    await expect(answerer.getByText('The Troll', { exact: true })).toHaveCount(0)
    await expect(answerer.getByLabel('Your answer')).toHaveCount(0)
    await expect(answerer.getByText('First to 100 points · Turn 1')).toBeVisible()
    await expect(opponentPrompt).toBeVisible()
    await expect(waiting).toHaveCount(0)
    await expect(supporter.getByText('First to 100 points · Turn 1')).toHaveCount(0)
    await expect(host.getByRole('timer')).toHaveAccessibleName(/seconds remaining/)
    await expect(host.getByRole('timer')).toHaveText('')
    await expect(host.locator('.timer svg path[stroke-dasharray]')).toHaveAttribute('stroke', '#ffffff')
    await expect.poll(() => frames.every(messages => messages.some(message => message.includes('"phase":"answering"')))).toBe(true)
    await expect(answerer.getByRole('heading', { level: 1, name: /^“.+”$/ }))
      .toHaveCSS('text-align', 'center')
    const subtitle = 'If you don’t have anything nice to say, say it on the internet.'
    await expect(answerer.getByText(subtitle)).toBeVisible()
    await expect(answerer.getByText('Private Persona', { exact: true })).toHaveCount(0)
    await expect(challenger.getByText(subtitle)).toHaveCount(0)
    await answerer.getByLabel('Your answer').fill('Lisbon')
    await answerer.getByLabel('Your answer').press('Enter')
    await expect(answerer.getByRole('heading', { level: 2, name: '“Lisbon”' })).toBeVisible()
    await expect(answerer.getByRole('button', { name: 'Submit answer' })).toHaveCount(0)
    await answerer.getByRole('button', { name: 'Change your mind?' }).click()
    await expect(answerer.getByLabel('Your answer')).toHaveValue('Lisbon')
    await answerer.getByLabel('Your answer').fill('Paris')
    await answerer.getByLabel('Your answer').press('Enter')
    await expect(answerer.getByRole('heading', { level: 2, name: '“Paris”' })).toBeVisible()
    await answerer.reload()
    await expect(answerer.getByRole('heading', { level: 2, name: '“Paris”' })).toBeVisible()
    await answerer.getByRole('button', { name: 'Change your mind?' }).click()
    await answerer.getByLabel('Your answer').fill('Rome')

    await expect(challenger.getByText('“Paris”', { exact: true })).toHaveCount(0)
    await expect(challenger.getByText('“Paris”', { exact: true })).toBeVisible({ timeout: 7000 })
    const longAnswer = 'Berlin'.repeat(24)
    await Promise.all([[challenger, 'Rome'], [other, longAnswer]].map(async ([page, text]) => {
      const player = page as typeof challenger
      await player.getByLabel('Challenge', { exact: true }).check()
      await player.getByLabel('Challenge answer').fill(text as string)
      await player.getByLabel('Challenge answer').press('Enter')
      await expect(player.getByRole('heading', { level: 2, name: `Your Challenge: “${text}”` }))
        .toHaveCSS('background-color', 'rgb(251, 248, 252)')
      await expect(player.getByRole('button', { name: 'Submit response' })).toHaveCount(0)
    }))
    await challenger.getByRole('button', { name: 'Change your mind?' }).click()
    await expect(challenger.getByLabel('Challenge answer')).toHaveValue('Rome')
    await challenger.getByLabel('Challenge answer').fill('Oslo')
    await challenger.getByRole('button', { name: 'Submit response' }).click()
    await expect(challenger.getByRole('heading', { level: 2, name: 'Your Challenge: “Oslo”' })).toBeVisible()
    await supporter.getByRole('radio', { name: 'Support', exact: true }).press('Enter')
    await expect(supporter.getByRole('heading', { level: 2, name: 'You Support this answer.' }))
      .toHaveCSS('background-color', 'rgb(245, 249, 253)')
    await supporter.getByRole('button', { name: 'Change your mind?' }).click()
    await supporter.getByRole('radio', { name: 'Challenge', exact: true }).check()
    await supporter.getByLabel('Challenge answer').fill('Unsubmitted draft')
    await supporter.getByRole('button', { name: 'Vote for Oslo' }).click({ timeout: 7000 })
    await expect(supporter.getByText('Original answer', { exact: true })).toHaveCSS('display', 'inline')
    const osloRow = supporter.getByRole('listitem').filter({ hasText: '“Oslo”' })
    await expect(osloRow).toHaveText(/^(“Oslo”)\s*(✓|Vote)$/)
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
    const duplicateButton = supporter.getByRole('button', { name: 'Report Duplicates' })
    await expect(duplicateButton).toHaveCSS('color', 'rgb(133, 34, 56)')
    await expect(duplicateButton).toHaveCSS('border-top-color', 'rgb(133, 34, 56)')
    await duplicateButton.click()
    const flagDialog = supporter.getByRole('dialog', { name: 'Flag duplicate answers' })
    const submitFlag = flagDialog.getByRole('button', { name: 'Submit flag' })
    await expect(submitFlag).toBeDisabled()
    await flagDialog.getByRole('checkbox', { name: '“Oslo”' }).check()
    await expect(submitFlag).toBeDisabled()
    await flagDialog.getByRole('checkbox', { name: `“${longAnswer}”` }).check()
    await submitFlag.click()
    await expect(challenger.getByText('You’re spectating because one of your answers was flagged.')).toBeVisible()
    await answerer.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(supporter.getByText(/Answers deemed duplicates/)).toBeVisible()
    await expect(supporter.getByText(/Your vote returned to the original answer/)).toBeVisible()
    await expect(selectedVote).toHaveCount(0)
    await expect(otherVote).toHaveCount(0)
    const duplicateLabel = supporter.getByRole('listitem').filter({ hasText: '“Oslo”' })
      .getByText('Duplicate', { exact: true })
    await expect(duplicateLabel).toHaveCSS('display', 'inline')
    await expect(duplicateLabel).toHaveCSS('color', 'rgb(133, 34, 56)')
    await expect(supporter.getByRole('button', { name: 'Vote for Paris' })).toHaveAttribute('aria-pressed', 'true')

    for (const [index, messages] of frames.entries()) {
      const votingViews = messages.map(raw => JSON.parse(raw) as ServerMessage)
        .flatMap(message => 'view' in message && message.view.phase === 'voting' ? [message.view] : [])
      expect(votingViews.length).toBeGreaterThan(0)
      for (const view of votingViews) {
        expect(view.entries.every(entry => !('authorId' in entry))).toBe(true)
      }
      if (index === answererIndex) continue
      const previewViews = messages.map(raw => JSON.parse(raw) as ServerMessage)
        .flatMap(message => 'view' in message && message.view.previewWait ? [message.view] : [])
      expect(previewViews.some(view => view.phase === 'persona-preview')).toBe(true)
      expect(previewViews.some(view => view.phase === 'prompt-preview')).toBe(true)
      expect(previewViews.every(view => view.prompt === undefined)).toBe(true)
      const preScoreFrames = messages.filter(raw => !raw.includes('"result"'))
      expect(preScoreFrames.every(raw => !raw.includes('The Troll'))).toBe(true)
      const privateViews = messages.map(raw => JSON.parse(raw) as ServerMessage)
        .flatMap(message => 'view' in message && !message.view.result ? [message.view] : [])
      expect(privateViews.every(view => view.persona === undefined)).toBe(true)
      if (pages[index] !== supporter) expect(privateViews.every(view => view.vote === undefined)).toBe(true)
    }
    await Promise.all(pages.map(async page => {
      await expect(page.getByRole('heading', { name: 'Final votes' })).toBeVisible({ timeout: 12_000 })
      await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Final votes' })).toHaveCount(0)
      await expect(page.getByText('The Troll')).toBeVisible()
      await expect(page.getByText(subtitle)).toBeVisible()
      await expect(page.getByText('4 pts')).toBeVisible()
      await expect(page.getByText('4 pts')).toHaveCSS('color', 'rgb(0, 0, 0)')
      await expect(page.locator('.score-change')).toHaveCount(0)
      await expect(page.locator('.standings .your-row')).toBeVisible()
      await expect(page.locator('.standings').getByText('You', { exact: true })).toHaveCount(0)
    }))
    await expect(answerer.getByLabel('Your answer')).toHaveCount(0)
    await expect.poll(async () => {
      const inputs = await Promise.all(pages.map(page => page.getByLabel('Your answer').count()))
      return inputs.reduce((total, count) => total + count, 0)
    }).toBe(1)
    const results = frames.map(messages => messages.map(raw => JSON.parse(raw) as ServerMessage)
      .flatMap(message => 'view' in message && message.view.result ? [message.view.result] : [])[0])
    for (const result of results) expect(result).toEqual(results[0])
    const menuToggle = host.getByRole('button', { name: 'Open room menu' })
    await expect(host.getByText(code, { exact: true })).toBeHidden()
    await menuToggle.click()
    const menu = host.getByRole('dialog', { name: 'Room menu' })
    await expect(menu.getByRole('heading')).toHaveCount(0)
    await expect(menu.getByRole('button', { name: 'Close' })).toHaveCSS('position', 'absolute')
    await expect(menu.getByText(code, { exact: true })).toBeVisible()
    await host.evaluate(async () => {
      await navigator.clipboard.writeText('clipboard fallback test')
      Object.defineProperty(navigator.clipboard, 'writeText', { value: undefined })
    })
    await menu.getByRole('button', { name: 'Copy room code' }).click()
    await expect(menu.getByRole('status')).toHaveText('Room code copied.')
    expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(code)
    await menu.getByRole('button', { name: 'Close' }).click()
    await expect(menuToggle).toBeFocused()
    await expect(menuToggle.locator('img')).toBeVisible()
    await expect(headerBack).toHaveCount(0)
    const guest = pages[1]
    await guest.getByRole('button', { name: 'Open room menu' }).click()
    await guest.getByRole('button', { name: 'Leave Game' }).click()
    await expect(guest).toHaveURL(/\/$/)
    expect(await guest.evaluate(roomCode => localStorage.getItem(`popular-opinion:${roomCode}`), code)).toBeTruthy()
    await menuToggle.click()
    await menu.getByRole('button', { name: 'End Game' }).click()
    const confirmation = host.getByRole('dialog', { name: 'End the game for everyone?' })
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole('button', { name: 'Cancel' }).click()
    await expect(confirmation).toBeHidden()
    await expect(menu).toBeVisible()
    await menu.getByRole('button', { name: 'End Game' }).click()
    await confirmation.getByRole('button', { name: 'End Game' }).click()
    await Promise.all([host, ...pages.slice(2)].map(async page => {
      await expect(page.getByText('The game was ended by the host.')).toBeVisible()
    }))
  } finally {
    await Promise.all(contexts.map(context => context.close()))
  }
})

test('scoring transfers each award in sequence with a pause between rows', async ({ page }) => {
  const time = new Date('2026-11-23T12:00:00Z')
  await page.clock.install({ time })
  const start = new Date(time.getTime() + 1000)
  await page.clock.pauseAt(start)
  const code = 'AABBCCDD'
  await page.addInitScript(roomCode => {
    localStorage.setItem(`public-opinion:${roomCode}`, 'saved-seat')
  }, code)
  await page.routeWebSocket('**/ws', ws => {
    ws.onMessage(message => {
      expect(JSON.parse(message.toString())).toEqual({ code, token: 'saved-seat' })
      ws.send(JSON.stringify({ view: {
        code, you: 'a', hostId: 'a', phase: 'scoring', answeringId: 'a',
        players: [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bea' }, { id: 'c', name: 'Cam' }],
        serverTime: start.getTime(), deadline: start.getTime() + 8_000, phaseDuration: 8_000,
        entries: [],
        match: { format: { type: 'rounds', rounds: 5 }, turnNumber: 1, scores: { a: 20, b: 12, c: 15 } },
        result: { missed: false, bonusTurn: true, entries: [], votes: {}, totals: {}, awards: { a: 10, b: -8, c: 0 } }
      } } satisfies ServerMessage))
    })
  })
  await page.goto(`/room/${code}`)
  const scores = page.locator('.score')
  const changes = page.locator('.score-change')
  await expect(page.getByRole('status').filter({ hasText: 'Alice will take another turn.' })).toBeVisible()
  await expect(scores).toHaveText(['+1010 pts', '+015 pts', '-820 pts'])
  const rightEdges = await scores.locator('strong').evaluateAll(totals =>
    totals.map(total => total.getBoundingClientRect().right)
  )
  expect(new Set(rightEdges).size).toBe(1)
  await expect(changes.nth(0)).toHaveCSS('color', 'rgb(34, 80, 41)')
  await expect(changes.nth(1)).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(changes.nth(2)).toHaveCSS('color', 'rgb(133, 34, 56)')
  expect(await page.evaluate(roomCode => [
    localStorage.getItem(`popular-opinion:${roomCode}`),
    localStorage.getItem(`public-opinion:${roomCode}`)
  ], code)).toEqual(['saved-seat', null])

  await page.clock.runFor(3000)
  await expect(scores).toHaveText(['+1010 pts', '+015 pts', '-820 pts'])
  await page.clock.runFor(575)
  await expect(scores).toHaveText(['+515 pts', '+015 pts', '-820 pts'])
  await page.clock.runFor(525)
  await expect(scores).toHaveText(['20 pts', '+015 pts', '-820 pts'])
  await page.clock.runFor(25)
  await expect(scores).toHaveText(['20 pts', '15 pts', '-820 pts'])
  await page.clock.runFor(300)
  await expect(scores).toHaveText(['20 pts', '15 pts', '-820 pts'])
  await page.clock.runFor(275)
  await expect(scores).toHaveText(['20 pts', '15 pts', '-416 pts'])
  await page.clock.runFor(250)
  await expect(scores).toHaveText(['20 pts', '15 pts', '12 pts'])
  await expect(changes).toHaveCount(0)
})

for (const seat of ['host', 'guest']) {
  test(`the ${seat} can exit from the final standings`, async ({ page }) => {
    const code = 'AABBCCDD'
    const token = `${seat}-seat`
    await page.addInitScript(({ code, token }) => {
      localStorage.setItem(`popular-opinion:${code}`, token)
    }, { code, token })
    await page.routeWebSocket('**/ws', ws => {
      ws.onMessage(message => {
        const input = JSON.parse(message.toString())
        if (input.type === 'end-game') {
          expect(seat).toBe('host')
          expect(input).toEqual({ type: 'end-game', confirmed: true })
          ws.send(JSON.stringify({ ended: true }))
          return
        }
        expect(input).toEqual({ code, token })
        ws.send(JSON.stringify({ view: {
          code, you: seat, hostId: 'host', phase: 'complete',
          players: [{ id: 'host', name: 'Host' }, { id: 'guest', name: 'Guest' }],
          serverTime: Date.now(), entries: [],
          match: {
            format: { type: 'rounds', rounds: 5 }, turnNumber: 10,
            scores: { host: 9, guest: 0 }, outcome: { type: 'winner', playerIds: ['host'] }
          },
          result: { missed: false, entries: [], votes: {}, totals: {}, awards: { host: 9, guest: 0 } }
        } } satisfies ServerMessage))
      })
    })
    await page.clock.install()
    await page.goto(`/room/${code}`)
    await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open room menu' })).toHaveCount(0)
    const exit = page.getByRole('button', { name: seat === 'host' ? 'End Game' : 'Leave Game' })
    await expect(exit).toBeVisible()
    const winner = page.getByRole('dialog', { name: 'Host wins!' })
    await expect(winner).toBeHidden()
    await page.clock.runFor(3000)
    await expect(winner.getByRole('heading', { level: 1 })).toHaveText('Host wins!')
    await page.clock.runFor(3000)
    await expect(winner).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Final standings' })).toBeVisible()
    await exit.click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)

    const toast = page.getByRole('status').filter({ hasText: 'The game was ended by the host.' })
    if (seat === 'host') {
      await expect(toast).toBeVisible()
      await expect(toast).toHaveCSS('position', 'fixed')
      await page.clock.runFor(3000)
      await expect(toast).toHaveCount(0)
    } else {
      await expect(toast).toHaveCount(0)
      expect(await page.evaluate(roomCode => localStorage.getItem(`popular-opinion:${roomCode}`), code)).toBe(token)
    }
  })
}

test('waiting hints wrap in order and keep their place when the prompt appears', async ({ page }) => {
  const code = 'AABBCCDD'
  await page.addInitScript(roomCode => {
    localStorage.setItem(`popular-opinion:${roomCode}`, 'waiting-seat')
    Math.random = () => 0.99
  }, code)
  let showPhase!: (phase: 'persona-preview' | 'answering' | 'response') => void
  await page.routeWebSocket('**/ws', ws => {
    showPhase = phase => {
      const now = Date.now()
      ws.send(JSON.stringify({ view: {
        code, you: 'b', hostId: 'a', phase, answeringId: 'a', turnId: 'turn-one',
        players: [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bea' }],
        serverTime: now, deadline: now + 10_000, phaseDuration: 10_000, entries: [],
        previewWait: phase === 'persona-preview' ? { deadline: now + 10_000, duration: 10_000 } : undefined,
        prompt: phase === 'persona-preview' ? undefined : 'What’s the best vacation destination?'
      } } satisfies ServerMessage))
    }
    ws.onMessage(() => showPhase('persona-preview'))
  })
  await page.goto(`/room/${code}`)
  const hint = page.locator('.waiting-hints')
  const visibleHint = hint.locator('[aria-live]')
  const waitingCard = page.locator('.round-preview .card')
  await expect(visibleHint).toContainText('Disqualified challengers can still be penalized')
  const waitingCardTop = await waitingCard.evaluate(async card => {
    await Promise.all(card.getAnimations().map(animation => animation.finished))
    return card.getBoundingClientRect().top
  })
  await hint.click()
  await expect(visibleHint).toContainText('By default, challengers score 2 points per vote.')
  expect(await waitingCard.evaluate(card => card.getBoundingClientRect().top)).toBe(waitingCardTop)
  await hint.press('Space')
  await expect(visibleHint).toContainText('Provided there is enough time')
  expect(await waitingCard.evaluate(card => card.getBoundingClientRect().top)).toBe(waitingCardTop)
  showPhase('answering')
  await expect(waitingCard.getByRole('heading', { name: '“What’s the best vacation destination?”' })).toBeVisible()
  await expect(visibleHint).toContainText('Provided there is enough time')
  showPhase('response')
  await expect(hint).toHaveCount(0)
})

test('the waiting room reserves space for all twelve seats', async ({ page, request }) => {
  let releaseSnapshot!: () => void
  const snapshotGate = new Promise<void>(resolve => { releaseSnapshot = resolve })
  await page.routeWebSocket('**/ws', ws => {
    const server = ws.connectToServer()
    server.onMessage(async message => {
      await snapshotGate
      ws.send(message)
    })
  })
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  const actions = page.locator('.home-actions')
  const actionsTop = await actions.evaluate(element => element.getBoundingClientRect().top)
  const joinGame = page.getByRole('button', { name: 'Join Game' })
  const createGame = page.getByRole('button', { name: 'Create Game' })
  await joinGame.click()
  await expect(page.getByLabel('Room code')).toBeFocused()
  await expect(joinGame).toHaveAttribute('aria-pressed', 'true')
  await joinGame.click()
  await expect(page.getByLabel('Room code')).toHaveCount(0)
  await expect(joinGame).toHaveAttribute('aria-pressed', 'false')
  expect(await actions.evaluate(element => element.getBoundingClientRect().top)).toBe(actionsTop)
  await createGame.click()
  await expect(createGame).toHaveAttribute('aria-pressed', 'true')
  await createGame.click()
  await expect(page.getByLabel('Screen name')).toHaveCount(0)
  await expect(createGame).toHaveAttribute('aria-pressed', 'false')
  await createGame.click()
  await expect(page.getByLabel('Screen name')).toBeFocused()
  expect(await actions.evaluate(element => element.getBoundingClientRect().top)).toBe(actionsTop)
  await page.getByLabel('Screen name').fill('Host')
  await page.getByRole('button', { name: 'Create room' }).click()
  const loading = page.getByRole('dialog', { name: 'Connecting to room…' })
  await expect(loading).toBeVisible()
  releaseSnapshot()
  await expect(loading).toBeHidden()
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
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(seats.last()).toBeInViewport({ ratio: 1 })
  await expect(seats.first()).toHaveCSS('background-color', 'rgb(218, 218, 218)')
  await expect(seats.nth(1)).toHaveCSS('background-color', 'rgb(206, 206, 206)')
  await expect(seats.nth(1)).toHaveCSS('border-top-width', '0px')
})
