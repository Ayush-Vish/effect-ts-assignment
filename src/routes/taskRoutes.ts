import { Layer, Effect,  FiberSet, Option } from "effect";
import { TaskRepository } from "../repositories/task.repo";
import { ApiResponse } from "../utils/util";
import { CreateTaskParams, UpdateTaskParams } from "../models/model";
import { Express } from "../app"
import { Schema } from "@effect/schema";
export const GetUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.get("/users/:user_id/tasks/:task_id", (req, res) => {
      const userId = req.params.user_id;
      const taskId = Number(req.params.task_id);
      if (isNaN(taskId)) {
        return new ApiResponse(res, 400, "Invalid Task ID");
      }
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.getTask(userId, taskId)),
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.sync(() =>
                new ApiResponse(res, 404, `Task ${taskId} not found for user ${userId}`)
              ),
            onSome: (task) =>
              Effect.sync(() => new ApiResponse(res, 200, "Task Found", task)),
          })
        )
      );
      runFork(program);
    });
  })
);

export const GetUserTasksRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.get("/users/:user_id/tasks", (req, res) => {
      const userId = req.params.user_id;
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.getTasksByUser(userId)),
        Effect.matchEffect({
          onFailure: (error) =>
            Effect.sync(() =>
              new ApiResponse(res, error.statusCode || 500, error.message)
            ),
          onSuccess: (tasks) =>
            Effect.sync(() =>
              new ApiResponse(res, 200, "Tasks Retrieved", tasks)
            ),
        })
      );
      runFork(program);
    });
  })
);

export const CreateUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.post("/users/:user_id/tasks", (req, res) => {
      const userId = req.params.user_id;
      const decodeBody = Schema.decodeUnknown(CreateTaskParams);
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) =>
          decodeBody(req.body).pipe(
            Effect.matchEffect({
              onFailure: () =>
                Effect.sync(() => new ApiResponse(res, 400, "Invalid Task")),
              onSuccess: (task) =>
                repo.createTask(userId, task).pipe(
                  Effect.flatMap((task) =>
                    Effect.sync(() => new ApiResponse(res, 200, "Task Created", { task }))
                  )
                ),
            })
          )
        )
      );
      runFork(program);
    });
  })
);

export const UpdateUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.put("/users/:user_id/tasks/:task_id", (req, res) => {
      const userId = req.params.user_id;
      const taskId = Number(req.params.task_id);
      if (isNaN(taskId)) {
        return new ApiResponse(res, 400, "Invalid Task ID");
      }
      const decodeBody = Schema.decodeUnknown(UpdateTaskParams);
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) =>
          decodeBody(req.body).pipe(
            Effect.matchEffect({
              onFailure: () =>
                Effect.sync(() => new ApiResponse(res, 400, "Invalid Task")),
              onSuccess: (task) =>
                repo.updateTask(userId, taskId, task).pipe(
                  Effect.matchEffect({
                    onFailure: (error) =>
                      Effect.sync(() => new ApiResponse(res, error.statusCode, error.message)),
                    onSuccess: (updatedTask) =>
                      Effect.sync(() => new ApiResponse(res, 200, "Task Updated", updatedTask)),
                  })
                ),
            })
          )
        )
      );
      runFork(program);
    });
  })
);

export const DeleteUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.delete("/users/:user_id/tasks/:task_id", (req, res) => {
      const userId = req.params.user_id;
      const taskId = Number(req.params.task_id);
      if (isNaN(taskId)) {
        return new ApiResponse(res, 400, "Invalid Task ID");
      }
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.deleteTask(userId, taskId)),
        Effect.matchEffect({
          onFailure: (error) =>
            Effect.sync(() => new ApiResponse(res, 400, error.message)),
          onSuccess: (message) =>
            Effect.sync(() => new ApiResponse(res, 200, message)),
        })
      );
      runFork(program);
    });
  })
);
