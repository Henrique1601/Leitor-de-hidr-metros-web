import { test, expect } from '@playwright/test';

test.describe('Leitor de Hidrometros', () => {
  test('page loads with title and input panel', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Leitor de Hidrometros');
    await expect(page.locator('.subtitle')).toBeVisible();
    await expect(page.locator('text=Entrada')).toBeVisible();
    await expect(page.locator('#chat-file')).toBeVisible();
    await expect(page.locator('#photo-files')).toBeVisible();
  });

  test('process button is disabled when no files selected', async ({ page }) => {
    await page.goto('/');
    const processBtn = page.locator('button.primary', { hasText: 'Processar fotos' });
    await expect(processBtn).toBeDisabled();
  });

  test('theme toggle switches between dark and light', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('.theme-toggle');
    await expect(toggle).toBeVisible();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('drag overlay appears on drag over', async ({ page }) => {
    await page.goto('/');
    const shell = page.locator('.shell');

    await page.dispatchEvent('.shell', 'dragover', {
      bubbles: true,
      cancelable: true,
    });

    await expect(page.locator('.drag-overlay')).toBeVisible();
    await expect(page.locator('.drag-overlay')).toContainText('Solte os arquivos aqui');
  });

  test('date inputs are optional and functional', async ({ page }) => {
    await page.goto('/');
    const dateStart = page.locator('#date-start');
    const dateEnd = page.locator('#date-end');

    await expect(dateStart).toBeVisible();
    await expect(dateEnd).toBeVisible();

    await dateStart.fill('2026-07-01');
    await dateEnd.fill('2026-07-31');

    await expect(dateStart).toHaveValue('2026-07-01');
    await expect(dateEnd).toHaveValue('2026-07-31');
  });

  test('history section is hidden until results exist', async ({ page }) => {
    await page.goto('/');

    const historySection = page.locator('text=Historico');
    await expect(historySection).not.toBeVisible();
  });

  test('keyboard navigation works with focus-visible', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});
