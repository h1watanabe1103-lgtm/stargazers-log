import { expect, test } from '@playwright/test';

type MockSkill = { name: string };
type MockEmployee = {
  id: number;
  name: string;
  department: string;
  skills: MockSkill[];
};

test('管理者が社員一覧を開き、検索してから社員を登録できる', async ({ page }) => {
  // APIをテスト用データに置き換え、実際の社員データを変更しない。
  let employees: MockEmployee[] = [
    { id: 1, name: '山田太郎', exact: true, department: '営業部', skills: [{ name: 'React' }] },
    { id: 2, name: '鈴木花子', exact: true, department: '開発部', skills: [{ name: 'TypeScript' }] },
  ];
  let createdPayload: { name: string; department: string; skills: MockSkill[] } | null = null;
  const corsHeaders = {
    'access-control-allow-origin': 'http://127.0.0.1:4173',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
  };

  await page.route('http://localhost:5200/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    // API URL is cross-origin in development, so handle CORS preflight for the mock API.
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname === '/auth/login' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ accessToken: 'playwright-test-token', role: 'Admin' }),
      });
      return;
    }

    if (url.pathname === '/employees/search' && method === 'GET') {
      const keyword = (url.searchParams.get('keyword') ?? '').toLocaleLowerCase();
      const result = employees.filter((employee) =>
        [employee.name, employee.department, ...employee.skills.map((skill) => skill.name)]
          .some((value) => value.toLocaleLowerCase().includes(keyword)),
      );
      await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(result) });
      return;
    }

    if (url.pathname === '/employees' && method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(employees) });
      return;
    }

    if (url.pathname === '/employees' && method === 'POST') {
      const body = request.postDataJSON() as { name: string; department: string; skills?: MockSkill[] };
      createdPayload = { name: body.name, department: body.department, skills: body.skills ?? [] };
      const created: MockEmployee = {
        id: Math.max(0, ...employees.map((employee) => employee.id)) + 1,
        name: body.name,
        department: body.department,
        skills: body.skills ?? [],
      };
      employees = [...employees, created];
      await route.fulfill({ status: 201, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(created) });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      headers: corsHeaders,
      body: JSON.stringify({ title: `テストで未定義のAPI: ${method} ${url.pathname}` }),
    });
  });

  // 1. ログインして社員一覧を開く。
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  await page.getByLabel('ID').fill('admin');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'ログイン', exact: true }).click();

  await expect(page.getByRole('heading', { name: '社員スキル一覧' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '山田太郎', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '鈴木花子', exact: true })).toBeVisible();

  // 2. 検索語を入力して絞り込み、対象外の社員が表示されないことを確認する。
  await page.getByPlaceholder('社員名・所属・スキルで検索...').fill('山田');
  await page.getByRole('button', { name: '検索' }).click();
  await expect(page.getByRole('cell', { name: '山田太郎', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '鈴木花子', exact: true })).toHaveCount(0);

  // 3. 社員を登録し、余白の除去も含めて保存後の一覧表示を確認する。
  await page.getByRole('button', { name: '社員を登録' }).click();
  await expect(page.getByRole('heading', { name: '社員を登録' })).toBeVisible();
  await page.getByLabel('氏名').fill(' 山田花子 ');
  await page.getByRole('textbox', { name: '所属', exact: true }).fill(' 開発部 ');
  await page.getByLabel('スキル名 1').fill('Playwright');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByRole('cell', { name: '山田花子', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '山田太郎', exact: true })).toBeVisible();
  expect(createdPayload).toEqual({
    name: '山田花子',
    department: '開発部',
    skills: [{ name: 'Playwright' }],
  });
});


test('スマートフォン幅でも社員一覧の全体が横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    sessionStorage.setItem('accessToken', 'mobile-layout-test-token');
    sessionStorage.setItem('role', 'Admin');
  });

  const employees: MockEmployee[] = [
    {
      id: 1,
      name: '山田太郎', exact: true,
      department: '営業部',
      skills: [{ name: 'React / TypeScript / アクセシビリティ' }],
    },
    {
      id: 2,
      name: '鈴木花子', exact: true,
      department: '開発部',
      skills: [{ name: 'SQL Server / Docker / .NET' }],
    },
  ];
  const corsHeaders = {
    'access-control-allow-origin': 'http://127.0.0.1:4173',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
  };

  await page.route('http://localhost:5200/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (url.pathname === '/employees' && request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(employees),
      });
      return;
    }
    if (url.pathname === '/employees/search' && request.method() === 'GET') {
      const keyword = (url.searchParams.get('keyword') ?? '').toLocaleLowerCase();
      const matches = employees.filter((employee) =>
        [employee.name, employee.department, ...employee.skills.map((skill) => skill.name)]
          .some((value) => value.toLocaleLowerCase().includes(keyword)),
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(matches),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      headers: corsHeaders,
      body: JSON.stringify({ title: 'Not found' }),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '社員スキル一覧' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: '社員名・所属・スキルで検索' })).toBeVisible();

  const documentWidths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(documentWidths.document).toBeLessThanOrEqual(documentWidths.viewport);
  expect(documentWidths.body).toBeLessThanOrEqual(documentWidths.viewport);

  const tableRegion = page.getByRole('region', { name: '社員一覧（横にスクロールできます）' });
  await expect(tableRegion).toBeVisible();
  const tableSizes = await tableRegion.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tableSizes.scrollWidth).toBeGreaterThan(tableSizes.clientWidth);
});
