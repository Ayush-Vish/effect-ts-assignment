import express, { Response } from "express";
import { Context, Effect, Layer, Runtime } from "effect";

import bodyParser from "body-parser";

import { CreateUserRouteLive } from "./routes/userRoutes";
import {
  CreateUserTaskRouteLive,
  DeleteUserTaskRouteLive,
  GetUserTaskRouteLive,
  GetUserTasksRouteLive,
  UpdateUserTaskRouteLive,
} from "./routes/taskRoutes";
import { TaskRepository } from "./repositories/task.repo";

export class Express extends Context.Tag("Express")<
  Express,
  ReturnType<typeof express>
>() {
  static readonly Live = Layer.sync(Express, () => {
    const app = express();
    app.use(bodyParser.json());

    return app;
  });
}

const ServerLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const port = 3000;
    const app = yield* _(Express);
    const runtime = yield* _(Effect.runtime());
    const runFork = Runtime.runFork(runtime);
    yield* _(
      Effect.acquireRelease(
        Effect.sync(() =>
          app.listen(port, () => {
            runFork(
              Effect.log(`Server listening for requests on port: ${port}`)
            );
          })
        ),
        (server) => Effect.sync(() => server.close())
      )
    );
  })
);

const MainLive = ServerLive.pipe(
  Layer.merge(CreateUserRouteLive),
  Layer.merge(CreateUserTaskRouteLive),
  Layer.merge(GetUserTaskRouteLive),
  Layer.merge(GetUserTasksRouteLive),
  Layer.merge(UpdateUserTaskRouteLive),
  Layer.merge(DeleteUserTaskRouteLive),
  Layer.provide(Express.Live),
  Layer.provide(TaskRepository.Live)
);

Layer.launch(MainLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
);
