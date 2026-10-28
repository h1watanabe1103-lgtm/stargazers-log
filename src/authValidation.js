const USER_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

function validateNewPassword(password, fieldName) {
  const errors = {};
  if (password.length < 8 || password.length > 100) {
    errors[fieldName] = ['パスワードは8〜100文字で入力してください。'];
  }
  return errors;
}

export function validateLogin(userName, password) {
  const errors = {};
  if (!userName.trim()) {
    errors.UserName = ['ユーザー名を入力してください。'];
  } else if (userName.length > 50) {
    errors.UserName = ['ユーザー名は50文字以内で入力してください。'];
  }
  if (!password) {
    errors.Password = ['パスワードを入力してください。'];
  } else if (password.length > 100) {
    errors.Password = ['パスワードは100文字以内で入力してください。'];
  }
  return errors;
}

export function validateRegistration(userName, password) {
  const errors = {};
  if (userName.length < 3 || userName.length > 50) {
    errors.UserName = ['ユーザー名は3〜50文字で入力してください。'];
  } else if (!USER_NAME_PATTERN.test(userName)) {
    errors.UserName = ['ユーザー名は半角英数字と _ . - のみ使用できます。'];
  }
  return { ...errors, ...validateNewPassword(password, 'Password') };
}

export function validatePasswordChange(currentPassword, newPassword) {
  const errors = {};
  if (!currentPassword) {
    errors.CurrentPassword = ['現在のパスワードを入力してください。'];
  }
  Object.assign(errors, validateNewPassword(newPassword, 'NewPassword'));
  if (currentPassword && currentPassword === newPassword) {
    errors.NewPassword = ['現在のパスワードと異なるパスワードを入力してください。'];
  }
  return errors;
}

export function validateAdminPassword(newPassword) {
  return validateNewPassword(newPassword, 'NewPassword');
}
