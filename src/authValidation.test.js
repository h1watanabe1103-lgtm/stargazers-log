import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAdminPassword,
  validateLogin,
  validatePasswordChange,
  validateRegistration,
} from './authValidation.js';

test('login requires a username and password', () => {
  assert.deepEqual(validateLogin('  ', ''), {
    UserName: ['ユーザー名を入力してください。'],
    Password: ['パスワードを入力してください。'],
  });
  assert.deepEqual(validateLogin('employee', 'secret'), {});
});

test('login rejects credentials above API length limits', () => {
  assert.deepEqual(validateLogin('u'.repeat(51), 'password'), {
    UserName: ['ユーザー名は50文字以内で入力してください。'],
  });
  assert.deepEqual(validateLogin('employee', 'p'.repeat(101)), {
    Password: ['パスワードは100文字以内で入力してください。'],
  });
});

test('registration validates username format and boundaries', () => {
  assert.deepEqual(validateRegistration('ab', 'password'), {
    UserName: ['ユーザー名は3〜50文字で入力してください。'],
  });
  assert.deepEqual(validateRegistration('日本語ユーザー', 'password'), {
    UserName: ['ユーザー名は半角英数字と _ . - のみ使用できます。'],
  });
  assert.deepEqual(validateRegistration('a'.repeat(51), 'password'), {
    UserName: ['ユーザー名は3〜50文字で入力してください。'],
  });
  assert.deepEqual(validateRegistration('user_01', '12345678'), {});
});

test('registration enforces password length', () => {
  assert.deepEqual(validateRegistration('user', '1234567'), {
    Password: ['パスワードは8〜100文字で入力してください。'],
  });
  assert.deepEqual(validateRegistration('user', 'p'.repeat(101)), {
    Password: ['パスワードは8〜100文字で入力してください。'],
  });
});

test('password change requires a current password and a different valid new password', () => {
  assert.deepEqual(validatePasswordChange('', 'short'), {
    CurrentPassword: ['現在のパスワードを入力してください。'],
    NewPassword: ['パスワードは8〜100文字で入力してください。'],
  });
  assert.deepEqual(validatePasswordChange('same-pass', 'same-pass'), {
    NewPassword: ['現在のパスワードと異なるパスワードを入力してください。'],
  });
  assert.deepEqual(validatePasswordChange('current', 'new-pass-1'), {});
});

test('administrator password reset uses the same password boundaries', () => {
  assert.deepEqual(validateAdminPassword('short'), {
    NewPassword: ['パスワードは8〜100文字で入力してください。'],
  });
  assert.deepEqual(validateAdminPassword('p'.repeat(100)), {});
});
