import { Context, Layer, Effect, Runtime } from "effect";
import express from "express";
import { UserRoutesLive } from "./routes/routes";
import { v4 as uuidv4 } from "uuid";
// Define Express as a service and saving it in the Context with the tag "Express"
class Express extends Context.Tag("Express")<
  Express,
  ReturnType<typeof express>
>() {}

// Define the main route, IndexRouteLive, as a Layer
const IndexRouteLive = Layer.effectDiscard(
  Effect.gen(function* () {
    const app = yield* Express;
    const runFork = Runtime.runFork(yield* Effect.runtime<never>());
    app.get("/", (_, res) => {
      runFork(Effect.sync(() => res.send("Hello World!")));
    });

    /**
     * GET /user: Create a new user.
     */
    app.get("/user", (req, res) => {
      runFork(
        Effect.sync(() => {
          return res.status(201).json({ id: uuidv4() });
        })
      );
    });

    app.post("/user/:id")


  })
);
// Server Setup
const ServerLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const port = 3001;
    const app = yield* Express;
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        app.listen(port, () =>
          console.log(`Example app listening on port ${port}`)
        )
      ),
      (server) => Effect.sync(() => server.close())
    );
  })
);

// Setting Up Express
const ExpressLive = Layer.sync(Express, () => express());

// Combine the layers
const AppLive = ServerLive.pipe(
  Layer.provide(IndexRouteLive),
  Layer.provide(ExpressLive)
);

// Run the program
Effect.runFork(Layer.launch(AppLive));
