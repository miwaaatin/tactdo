// Quick end-to-end smoke test against a running server: node scripts/smoke.js [url]
const url = process.argv[2] || 'http://localhost:4000/';
const assert = require('node:assert/strict');

async function gql(query, variables, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

(async () => {
  const email = `smoke${Date.now()}@test.com`;
  const { signup } = await gql(
    'mutation($e:String!,$p:String!){signup(email:$e,password:$p){token user{id email}}}',
    { e: email, p: 'secret123' }
  );
  console.log('signup ok', signup.user.email);
  const { login } = await gql('mutation($e:String!,$p:String!){login(email:$e,password:$p){token}}', {
    e: email,
    p: 'secret123',
  });
  const t = login.token;
  assert.ok(t, 'Login must return a token');
  const { createTodo } = await gql('mutation{createTodo(title:"Buy milk"){id title completed}}', {}, t);
  console.log('create ok', createTodo);
  assert.equal(createTodo.title, 'Buy milk');
  assert.equal(createTodo.completed, false);
  const { updateTodo } = await gql(
    'mutation($id:ID!){updateTodo(id:$id,completed:true){id completed}}',
    { id: createTodo.id },
    t
  );
  console.log('update ok', updateTodo);
  assert.equal(updateTodo.completed, true);
  const todos = (await gql('{todos{id title completed}}', {}, t)).todos;
  assert.ok(todos.some((todo) => todo.id === createTodo.id && todo.completed));
  console.log('list ok');
  await gql('mutation($id:ID!){deleteTodo(id:$id)}', { id: createTodo.id }, t);
  assert.equal((await gql('{todos{id}}', {}, t)).todos.length, 0);
  console.log('delete ok; remaining 0');
  let rejected = false;
  try {
    await gql('{todos{id}}');
  } catch (e) {
    assert.match(e.message, /You must be logged in/);
    rejected = true;
    console.log('unauthenticated correctly rejected:', e.message);
  }
  assert.ok(rejected, 'Unauthenticated requests must be rejected');
})().catch((e) => {
  console.error('SMOKE FAILED', e);
  process.exit(1);
});
