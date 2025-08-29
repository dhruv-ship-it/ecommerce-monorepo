import bcrypt from 'bcryptjs';

// In-memory mock user database
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed
}

const users: User[] = [];

export function findUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email);
}

export function createUser({ name, email, password }: { name: string; email: string; password: string }): User {
  const id = (users.length + 1).toString();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = { id, name, email, password: hashedPassword };
  users.push(user);
  return user;
}

export function validatePassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password);
}

export function getUserSafe(user: User) {
  // Return user object without password
  const { password, ...safeUser } = user;
  return safeUser;
} 