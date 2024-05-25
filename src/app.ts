import { Context, Layer, Effect, Runtime } from "effect"
import express from "express"

// Define Express as a service
class Express extends Context.Tag("Express")<
  Express,
  ReturnType<typeof express>
>() {}

// Define the main route, IndexRouteLive, as a Layer
const IndexRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const app = yield* Express
    const runFork = Runtime.runFork(yield* Effect.runtime<never>())

    app.get("/", (_, res) => {
      runFork(Effect.sync(() => res.send("Hello World!")))
    })
  })
)

// Server Setup
const ServerLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const port = 3001
    const app = yield* Express
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        app.listen(port, () =>
          console.log(`Example app listening on port ${port}`)
        )
      ),
      (server) => Effect.sync(() => server.close())
    )
  })
)

// Setting Up Express
const ExpressLive = Layer.sync(Express, () => express())

// Combine the layers
const AppLive = ServerLive.pipe(
  Layer.provide(IndexRouteLive),
  Layer.provide(ExpressLive)
)

// Run the program
Effect.runFork(Layer.launch(AppLive))