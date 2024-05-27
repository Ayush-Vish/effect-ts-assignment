const request = require('supertest');
const server = "http://localhost:3000";

describe("API Endpoints", () => {
  // Test for POST /users
  it("should create a new user", async () => {
    const res = await request(server)
      .get("/users")
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
    expect (res.body).toHaveProperty('user_id');
  });

});