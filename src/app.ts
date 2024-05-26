import { Context, Layer, Effect, Runtime } from "effect";
import express from "express";

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

const server = Layer.scopedDiscard(
  Effect.gen(function*() {
    const port = 3000;
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
  Layer.provide(Express.Live)

)

Layer.launch(Main).pipe(
  Effect.tapError(Effect.logError), 
  Effect.runFork
)