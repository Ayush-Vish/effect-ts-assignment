const request = require('supertest');
const server = "http://localhost:3000";

describe("API Endpoints", () => {
  let userId: string;
  let taskId: number;

  // Test for POST /users
  it("should create a new user", async () => {
    const res = await request(server)
      .post("/users");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'User Created');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('user_id');
    userId = res.body.data.user_id; 
  });

  // Test for POST /users/:user_id/tasks
  it("should create a new task for the specified user", async () => {
    const taskData = {
      name: "Test Task",
      status: "pending",
      description: "This is a test task"
    };
    const res = await request(server)
      .post(`/users/${userId}/tasks`)
      .send(taskData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Task Created');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('task_id');
    taskId = res.body.data.task_id; 
  });

  // Test for GET /users/:user_id/tasks
  it("should retrieve all tasks for the specified user", async () => {
    const res = await request(server)
      .get(`/users/${userId}/tasks`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Tasks Retrieved');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // Test for GET /users/:user_id/tasks/:task_id
  it("should retrieve a specific task for the specified user", async () => {
    const res = await request(server)
      .get(`/users/${userId}/tasks/${taskId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Task Found');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('task_id', Number(taskId));
    expect(res.body.data).toHaveProperty('user_id', userId);
  });

  // Test for PUT /users/:user_id/tasks/:task_id
  it("should update a specific task for the specified user", async () => {
    const updatedTaskData = {
      name: "Updated Test Task",
      status: "completed",
      description: "This is an updated test task"
    };
    const res = await request(server)
      .put(`/users/${userId}/tasks/${taskId}`)
      .send(updatedTaskData);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Task Updated');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('task_id', Number(taskId));
    expect(res.body.data).toHaveProperty('user_id', userId);
    expect(res.body.data).toHaveProperty('name', updatedTaskData.name);
    expect(res.body.data).toHaveProperty('status', updatedTaskData.status);
    expect(res.body.data).toHaveProperty('description', updatedTaskData.description);
  });

  // Test for DELETE /users/:user_id/tasks/:task_id
  it("should delete a specific task for the specified user", async () => {
    const res = await request(server)
      .delete(`/users/${userId}/tasks/${taskId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', `Task ${taskId} deleted`);
  });
});
