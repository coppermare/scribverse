import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('homepage transcript tool smoke test', async ({ page }) => {
  await page.route(/\/api\/transcribe\/?$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        videoId: 'testid12345',
        title: 'Smoke Test Video Title',
        slug: 'smoke-test-video-title',
        coverUrl: '',
        durationMinutes: 5,
        platform: 'youtube',
        mediaType: 'video',
        description: 'Short description for smoke test.',
        transcript: 'Hello from the mocked transcript.',
        url: 'https://www.youtube.com/watch?v=testid12345',
        channelTitle: 'Smoke Channel',
      }),
    });
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Paste a video link, get Markdown.',
    })
  ).toBeVisible();

  await page.getByTestId('transcribe-url').fill('https://www.youtube.com/watch?v=testid12345');

  const transcribeResponse = page.waitForResponse(
    (r) =>
      /\/api\/transcribe\/?(\?.*)?$/.test(new URL(r.url()).pathname) &&
      r.request().method() === 'POST'
  );
  await page.getByTestId('transcribe-url').press('Enter');
  await transcribeResponse;

  await expect(page.getByTestId('transcribe-result-title')).toHaveText('Smoke Test Video Title');
  await expect(page.getByText('Hello from the mocked transcript.')).toBeVisible();

  await page.getByTestId('transcribe-copy').click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('## Transcript');
  expect(clip).toContain('Hello from the mocked transcript.');
});

test('transcript tool validation and API error states', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('transcribe-submit').click();
  await expect(page.getByTestId('transcribe-error')).toContainText('Paste a video link');

  await page.getByTestId('transcribe-url').fill('https://example.com/not-youtube');
  await page.getByTestId('transcribe-submit').click();
  await expect(page.getByTestId('transcribe-error')).toContainText('public video URL');

  await page.route(/\/api\/transcribe\/?$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Video not found for this test.' }),
    });
  });

  await page.getByTestId('transcribe-url').fill('https://www.youtube.com/watch?v=deadbeef000');
  await page.getByTestId('transcribe-submit').click();
  await expect(page.getByTestId('transcribe-error')).toContainText('Video not found for this test.');
});

test('transcript tool non-JSON success body shows friendly error', async ({ page }) => {
  await page.route(/\/api\/transcribe\/?$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'not-json',
    });
  });

  await page.goto('/');
  await page.getByTestId('transcribe-url').fill('https://www.youtube.com/watch?v=testid12345');
  await page.getByTestId('transcribe-submit').click();
  await expect(page.getByTestId('transcribe-error')).toContainText('Could not read the server response');
});

test('close transcript returns to initial view', async ({ page }) => {
  await page.route(/\/api\/transcribe\/?$/, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        videoId: 'closeTest01',
        title: 'Close Test Video',
        slug: 'close-test-video',
        coverUrl: '',
        durationMinutes: 1,
        platform: 'youtube',
        mediaType: 'video',
        description: '',
        transcript: 'Only for close test.',
        url: 'https://www.youtube.com/watch?v=closeTest01',
        channelTitle: 'Test',
      }),
    });
  });

  await page.goto('/');
  await page.getByTestId('transcribe-url').fill('https://www.youtube.com/watch?v=closeTest01');
  await page.getByTestId('transcribe-submit').click();
  await expect(page.getByTestId('transcribe-result-title')).toHaveText('Close Test Video');

  await page.getByTestId('transcribe-close').click();
  await expect(
    page.getByRole('heading', { name: 'Paste a video link, get Markdown.' })
  ).toBeVisible();
  await expect(page.getByTestId('transcribe-url')).toHaveValue('');
});

test('sitemap and robots smoke test', async ({ page }) => {
  await page.goto('/sitemap.xml');
  await expect(page.locator('body')).toContainText('<urlset');
  await expect(page.locator('body')).toContainText('<loc>');
  await expect(page.locator('body')).toContainText('/privacy');

  await page.goto('/robots.txt');
  await expect(page.locator('body')).toContainText('Sitemap:');
});

test('privacy page renders', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Third parties' })).toBeVisible();
});
