import { Effect, Layer } from "effect";
import { Express } from "../app";

const RegisterUser = Layer.scopedDiscard(Effect.gen(function*() {
      const app = yield* (Express);
      const runFork =yield*
}))