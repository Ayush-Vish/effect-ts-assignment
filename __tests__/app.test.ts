const request = require('supertest');
const server = "http://localhost:3000";

describe("API Endpoints", () => {
  let userId : string;
  let taskId : number;
  // Test for POST /users
  it("should create a new user", async () => {
    const res = await request(server)
      .post("/users")
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'User Created');
    expect(res.body).toHaveProperty('user_id');
    userId = res.body.user_id; // store userId for later tests
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
    expect(res.body).toHaveProperty('task_id');
    taskId = res.body.task_id; // store taskId for later tests
  });

  // Test for GET /users/:user_id/tasks
  it("should retrieve all tasks for the specified user", async () => {
    const res = await request(server)
      .get(`/users/${userId}/tasks`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  // Test for GET /users/:user_id/tasks/:task_id
  it("should retrieve a specific task for the specified user", async () => {
    const res = await request(server)
      .get(`/users/${userId}/tasks/${taskId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('task_id', Number(taskId));
    expect(res.body).toHaveProperty('user_id', userId);
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
    expect(res.body).toHaveProperty('task');
      expect(res.body.task).toHaveProperty('name', updatedTaskData.name);
      expect(res.body.task).toHaveProperty('status', updatedTaskData.status);
      expect(res.body.task).toHaveProperty('description', updatedTaskData.description);

  });

  // Test for DELETE /users/:user_id/tasks/:task_id
  it("should delete a specific task for the specified user", async () => {
    const res = await request(server)
      .delete(`/users/${userId}/tasks/${taskId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', `Task ${taskId} deleted`);
  });
});