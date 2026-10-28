export type FieldErrors = Record<string, string[]>;

export function validateLogin(userName: string, password: string): FieldErrors;
export function validateRegistration(userName: string, password: string): FieldErrors;
export function validatePasswordChange(currentPassword: string, newPassword: string): FieldErrors;
export function validateAdminPassword(newPassword: string): FieldErrors;
