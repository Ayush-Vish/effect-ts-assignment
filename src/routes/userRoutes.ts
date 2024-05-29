import { Layer, Effect, FiberSet, Runtime } from "effect";
import { ApiResponse } from "../utils/util";
import { TaskRepository } from "../repositories/task.repo";
import { Express } from "../app";

export const CreateUserRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.post("/users", (_, res) => {
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.createUser()),
        Effect.flatMap((user) =>
          Effect.sync(() => new ApiResponse(res, 200, "User Created", { user_id: user.user_id }))
        ),
        Effect.catchAll((error) =>
          Effect.sync(() => new ApiResponse(res, 500, "Internal Server Error"))
        )
      );
      runFork(program);
    });
  })
);
