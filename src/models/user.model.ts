export class User {
  id?: number;
  name?: string;
  email?: string;
  password?: string;

  constructor({ id, name, email, password }: User) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
  }
}
