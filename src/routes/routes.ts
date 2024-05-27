import { Effect, FiberSet, Layer, Option } from "effect";
import { Express, TaskRepo } from "../app";
import * as Schema from "@effect/schema/Schema";
import { CreateTaskParams, TaskSchema } from "../models/model";
type CreateTaskParams = Schema.Schema.Type<typeof CreateTaskParams>;

const createTaskRoute = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* Express;
    const runFork = yield* FiberSet.makeRuntime<TaskRepo>();
    app.post("/user/:user_id/tasks", (req, _) => {
      const uid = req.params.user_id as unknown as number;

      const program = TaskRepo.pipe(
        Effect.flatMap((repo) => {
          console.log(repo);

          return repo.createTask(req.body as CreateTaskParams, uid);
        })
      );

      runFork(program);
    });
  })
);

const GetTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* Express;
    const runFork = yield* FiberSet.makeRuntime<TaskRepo>();
    app.get("/user/:user_id/tasks/:task_id", (req, res) => {
      const user_id = req.params.user_id;
      const task_id = req.params.task_id;
      const program = TaskRepo.pipe(
        Effect.flatMap((repo) => repo.getTask(Number(task_id))),
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.sync(() =>
                res.status(404).json(`Task ${task_id} not found`)
              ),
            onSome: (task) => Effect.sync(() => res.json(task)),
          })
        )
      );
      runFork(program);
    });
  })
);

export { GetTaskRouteLive, createTaskRoute };
