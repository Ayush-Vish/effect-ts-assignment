import { Context, Layer, Effect, Runtime } from "effect";
import express from "express";
import { makeTaskRepository } from "./models/model";
import { GetTaskRouteLive, createTaskRoute } from "./routes/routes";

export class Express extends Context.Tag("Express")<
  Express,
  ReturnType<typeof express>
>() {
  static Live =Layer.sync(Express, () => {
    const app = express();
    app.use(express.json());
    return app;
  })
}

export class TaskRepo extends Context.Tag("TaskRepo")<TaskRepo , Effect.Effect.Success<typeof makeTaskRepository> >() {
  static readonly  Live = Layer.effect(TaskRepo, makeTaskRepository)
} 

const server = Layer.scopedDiscard(
  Effect.gen(function*() {
    const port = 3002;
    const app = yield* (Express);
    const runTime = yield* (Effect.runtime<never>());
    const runFork = Runtime.runFork(runTime);
    yield * (Effect.sync(() => {
      app.listen(port, () => {
        runFork(Effect.log(`Server is running on port ${port}`));

      });
    }))
  })
)


const Main = server.pipe(
  Layer.merge(createTaskRoute),
  Layer.merge(GetTaskRouteLive),

  Layer.provide(Express.Live),
  Layer.provide(TaskRepo.Live)

)

Layer.launch(Main).pipe(
  Effect.tapError(Effect.logError), 
  Effect.runFork
)