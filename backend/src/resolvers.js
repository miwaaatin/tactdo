const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GraphQLError } = require('graphql');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (message, code) => {
  throw new GraphQLError(message, { extensions: { code } });
};

const requireUser = (ctx) => {
  if (!ctx.userId) fail('You must be logged in', 'UNAUTHENTICATED');
  return ctx.userId;
};

const publicUser = ({ passwordHash, ...u }) => u;

const issueToken = (user) => jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

/** Extracts the user id from an "Authorization: Bearer <token>" header. */
function getUserIdFromAuthHeader(header) {
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  try {
    return jwt.verify(token, JWT_SECRET).sub;
  } catch {
    return null;
  }
}

const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      if (!ctx.userId) return null;
      const user = await ctx.store.getUserById(ctx.userId);
      return user ? publicUser(user) : null;
    },
    todos: (_, __, ctx) => ctx.store.listTodos(requireUser(ctx)),
    todo: (_, { id }, ctx) => ctx.store.getTodo(requireUser(ctx), id),
  },

  Mutation: {
    signup: async (_, { email, password }, { store }) => {
      email = email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) fail('Invalid email address', 'BAD_USER_INPUT');
      if (password.length < 6) fail('Password must be at least 6 characters', 'BAD_USER_INPUT');
      if (await store.getUserByEmail(email)) fail('Email is already registered', 'BAD_USER_INPUT');

      const user = {
        id: crypto.randomUUID(),
        email,
        passwordHash: await bcrypt.hash(password, 10),
        createdAt: new Date().toISOString(),
      };
      try {
        await store.createUser(user);
      } catch (e) {
        if (e.name === 'TransactionCanceledException') fail('Email is already registered', 'BAD_USER_INPUT');
        throw e;
      }
      return { token: issueToken(user), user: publicUser(user) };
    },

    login: async (_, { email, password }, { store }) => {
      const user = await store.getUserByEmail(email.trim().toLowerCase());
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        fail('Invalid email or password', 'UNAUTHENTICATED');
      }
      return { token: issueToken(user), user: publicUser(user) };
    },

    createTodo: async (_, { title }, ctx) => {
      const userId = requireUser(ctx);
      title = title.trim();
      if (!title) fail('Title cannot be empty', 'BAD_USER_INPUT');
      const now = new Date().toISOString();
      return ctx.store.putTodo({
        id: crypto.randomUUID(),
        userId,
        title,
        completed: false,
        createdAt: now,
        updatedAt: now,
      });
    },

    updateTodo: async (_, { id, title, completed }, ctx) => {
      const userId = requireUser(ctx);
      const todo = await ctx.store.getTodo(userId, id);
      if (!todo) fail('To-do not found', 'NOT_FOUND');
      if (title !== undefined && title !== null) {
        title = title.trim();
        if (!title) fail('Title cannot be empty', 'BAD_USER_INPUT');
        todo.title = title;
      }
      if (completed !== undefined && completed !== null) todo.completed = completed;
      todo.updatedAt = new Date().toISOString();
      return ctx.store.putTodo(todo);
    },

    deleteTodo: async (_, { id }, ctx) => {
      const userId = requireUser(ctx);
      const ok = await ctx.store.deleteTodo(userId, id);
      if (!ok) fail('To-do not found', 'NOT_FOUND');
      return id;
    },
  },
};

module.exports = { resolvers, getUserIdFromAuthHeader };
