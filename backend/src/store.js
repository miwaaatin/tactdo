/**
 * Storage layer.
 *
 * Two interchangeable implementations behind the same async interface:
 *  - FileStore:   simple JSON-file persistence (local development)
 *  - DynamoStore: AWS DynamoDB (used on Lambda, where the filesystem is ephemeral)
 *
 * Selected via the TABLE_NAME env var: if set -> DynamoDB, otherwise -> file.
 */
const fs = require('fs');
const path = require('path');

class FileStore {
  constructor(file) {
    this.file = file;
    this.data = { users: [], todos: [] };
    if (fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        console.warn(`Could not parse ${file}, starting with empty data`);
      }
    }
  }

  async _save() {
    await fs.promises.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }

  async getUserByEmail(email) {
    return this.data.users.find((u) => u.email === email) || null;
  }

  async getUserById(id) {
    return this.data.users.find((u) => u.id === id) || null;
  }

  async createUser(user) {
    this.data.users.push(user);
    await this._save();
    return user;
  }

  async listTodos(userId) {
    return this.data.todos
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTodo(userId, id) {
    return this.data.todos.find((t) => t.userId === userId && t.id === id) || null;
  }

  async putTodo(todo) {
    const i = this.data.todos.findIndex((t) => t.id === todo.id);
    if (i >= 0) this.data.todos[i] = todo;
    else this.data.todos.push(todo);
    await this._save();
    return todo;
  }

  async deleteTodo(userId, id) {
    const before = this.data.todos.length;
    this.data.todos = this.data.todos.filter((t) => !(t.userId === userId && t.id === id));
    await this._save();
    return this.data.todos.length < before;
  }
}

/**
 * Single-table DynamoDB design:
 *   USER#<email>        / PROFILE      -> user record (lookup by email)
 *   USERID#<id>         / PROFILE      -> user record (lookup by id)
 *   USERID#<userId>     / TODO#<id>    -> todo item
 */
class DynamoStore {
  constructor(tableName) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const lib = require('@aws-sdk/lib-dynamodb');
    this.lib = lib;
    this.table = tableName;
    this.doc = lib.DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async _get(pk, sk) {
    const res = await this.doc.send(new this.lib.GetCommand({ TableName: this.table, Key: { pk, sk } }));
    return res.Item || null;
  }

  static _strip(item) {
    if (!item) return null;
    const { pk, sk, ...rest } = item;
    return rest;
  }

  async getUserByEmail(email) {
    return DynamoStore._strip(await this._get(`USER#${email}`, 'PROFILE'));
  }

  async getUserById(id) {
    return DynamoStore._strip(await this._get(`USERID#${id}`, 'PROFILE'));
  }

  async createUser(user) {
    // Conditional put guarantees email uniqueness even under concurrency
    await this.doc.send(
      new this.lib.TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.table,
              Item: { pk: `USER#${user.email}`, sk: 'PROFILE', ...user },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          { Put: { TableName: this.table, Item: { pk: `USERID#${user.id}`, sk: 'PROFILE', ...user } } },
        ],
      })
    );
    return user;
  }

  async listTodos(userId) {
    const res = await this.doc.send(
      new this.lib.QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: { ':pk': `USERID#${userId}`, ':sk': 'TODO#' },
      })
    );
    return (res.Items || [])
      .map(DynamoStore._strip)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTodo(userId, id) {
    return DynamoStore._strip(await this._get(`USERID#${userId}`, `TODO#${id}`));
  }

  async putTodo(todo) {
    await this.doc.send(
      new this.lib.PutCommand({
        TableName: this.table,
        Item: { pk: `USERID#${todo.userId}`, sk: `TODO#${todo.id}`, ...todo },
      })
    );
    return todo;
  }

  async deleteTodo(userId, id) {
    const res = await this.doc.send(
      new this.lib.DeleteCommand({
        TableName: this.table,
        Key: { pk: `USERID#${userId}`, sk: `TODO#${id}` },
        ReturnValues: 'ALL_OLD',
      })
    );
    return Boolean(res.Attributes);
  }
}

function createStore() {
  if (process.env.TABLE_NAME) return new DynamoStore(process.env.TABLE_NAME);
  const file = process.env.DB_FILE || path.join(__dirname, '..', 'db.json');
  return new FileStore(file);
}

module.exports = { createStore, FileStore, DynamoStore };
