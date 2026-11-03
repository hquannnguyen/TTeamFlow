import { expect, test, type Page } from '@playwright/test';

/**
 * E1–E6: các luồng "vùng vàng" của TTeamFlow.
 * Điều kiện: app đang chạy tại baseURL, DB đã seed tài khoản:
 *   admin@example.com / Admin@123
 *   member@example.com / Member@123
 */

const ADMIN = { email: 'admin@example.com', password: 'Admin@123' };

async function login(page: Page, account = ADMIN) {
  await page.goto('/login');
  await page.getByLabel('Email').or(page.locator('#login-email')).fill(account.email);
  await page.locator('#login-password').fill(account.password);
  await page.locator('#login-submit').click();
  // Sau đăng nhập luôn về dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
  await page.context().clearCookies();
}

// ── E1: Đăng nhập đúng / sai ──────────────────────────────────────────────────

test.describe('E1 - Đăng nhập', () => {
  test('đăng nhập sai mật khẩu hiện thông báo lỗi', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(ADMIN.email);
    await page.locator('#login-password').fill('WrongPass@999');
    await page.locator('#login-submit').click();
    await expect(
      page.getByText(/không chính xác|Email hoặc mật khẩu/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    // Vẫn ở trang login
    await expect(page).toHaveURL(/login/);
  });

  test('đăng nhập đúng chuyển tới dashboard', async ({ page }) => {
    await login(page);
    await logout(page);
  });
});

// ── E2: Tạo dự án mới → 3 cột mặc định ───────────────────────────────────────

test.describe('E2 - Tạo dự án', () => {
  test('dự án mới có 3 cột TODO/DOING/DONE', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Mở modal tạo dự án (nút chính trên trang dự án)
    const createBtn = page.getByRole('button', { name: /tạo dự án|dự án mới|new project/i }).first();
    await createBtn.click();

    const projectName = `E2E Test ${Date.now()}`;
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill(projectName);
    await page.getByRole('button', { name: /tạo|create/i }).last().click();

    // Đợi modal đóng rồi mở dự án vừa tạo (theo tên)
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 15_000 });
    await page.getByText(projectName).first().click();

    // Kiểm tra 3 cột mặc định
    await expect(page.getByText(/^TODO$/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^DOING$/i).first()).toBeVisible();
    await expect(page.getByText(/^DONE$/i).first()).toBeVisible();
    await logout(page);
  });
});

// ── E3: Tạo task ──────────────────────────────────────────────────────────────

test.describe('E3 - Tạo công việc', () => {
  test('task mới xuất hiện trên bảng', async ({ page }) => {
    await login(page);

    // Vào bảng dự án đầu tiên trong danh sách
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    const createTaskBtn = page.getByRole('button', { name: /thêm công việc|tạo công việc|thêm task|new task|\+/i }).first();
    await createTaskBtn.click();

    const taskTitle = `E2E Task ${Date.now()}`;
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(taskTitle);
    await page.getByRole('button', { name: /tạo|thêm|create|lưu/i }).last().click();

    // Task xuất hiện trên bảng
    await expect(page.getByText(taskTitle).first()).toBeVisible({ timeout: 15_000 });
    await logout(page);
  });
});

// ── E6: Phân quyền — route bảo vệ ────────────────────────────────────────────

test.describe('E6 - Bảo vệ route & phân quyền', () => {
  test('truy cập dashboard khi chưa đăng nhập bị đẩy về /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test('admin mới thấy trang quản trị, user thường bị chặn', async ({ page }) => {
    await login(page);
    await page.goto('/admin/users');
    // ADMIN truy cập được trang quản trị
    await expect(page).toHaveURL(/admin/, { timeout: 10_000 });
    await logout(page);

    // User thường: bị chuyển hướng (không có nội dung quản trị)
    await login(page, { email: 'member@example.com', password: 'Member@123' });
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/admin/, { timeout: 10_000 });
    await logout(page);
  });
});
