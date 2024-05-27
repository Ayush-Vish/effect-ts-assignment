import * as Schema from "@effect/schema/Schema";
import bodyParser from "body-parser";
import {

  Context,
  Effect,
  FiberSet,
  HashMap,
  Layer,
  Option,
  Array,
  Ref,
  Runtime,
} from "effect";
import express ,  {Response}  from "express";

import { v4 as uuidv4 } from "uuid";

class HTTPError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
class ApiResponse  {
  constructor(res: Response,statusCode : number,    message?: string , data?:any) {
    res.status(statusCode).json({ message, data });
  }
}

class Express extends Context.Tag("Express")<
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

/**
 * Routes
 */

/**
 * Create a new user
 */
const CreateUserLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const app = yield* Express;
    app.post("/users", (_, res) => {
      return new ApiResponse(res, 200 , "User Created" , {user_id : uuidv4()})
    });
  })
);
/**
 * Get a task for a user
 */

const GetUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.get("/users/:user_id/tasks/:task_id", (req, res) => {
      const userId = req.params.user_id;
      const taskId = req.params.task_id;
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.getTaskByUser(userId, Number(taskId))),
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.sync(() => new ApiResponse(res, 404, `Task ${taskId} not found for user ${userId}`)
              ),
            onSome: (task) => Effect.sync(() => new ApiResponse(res, 200, "Task Found", task)),
          })
        )
      );
      runFork(program);
    });
  })
);

/**
 * Get all tasks for a user
 */

const GetUserTasksRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.get("/users/:user_id/tasks", (req, res) => {
      const userId = req.params.user_id;
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.getTasksByUser(userId)),
        Effect.flatMap((tasks) => Effect.sync(() => new ApiResponse(res, 200, "Tasks Retrieved", tasks)))
      );
      runFork(program);
    });
  })
);
/**
 * Create a new task for a user
 */
const CreateUserTaskRouteLive = Layer.scopedDiscard(
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
                repo
                  .createTask(userId, task)
                  .pipe(
                    Effect.flatMap((id) =>
                      Effect.sync(() => new ApiResponse(res , 200 , "Task Created", {task_id :id })  )
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

/**
 * Update a task for a user
 */
const UpdateUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.put("/users/:user_id/tasks/:task_id", (req, res) => {
      const userId = req.params.user_id;
      const taskId = req.params.task_id as unknown as number;
      console.log(userId, typeof taskId);
      console.log(req.body);
      const decodeBody = Schema.decodeUnknown(UpdateTaskParams);
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) =>
          decodeBody(req.body).pipe(
            Effect.matchEffect({
              onFailure: () =>
                Effect.sync(() => new ApiResponse(res, 400, "Invalid Task")),
              onSuccess: (task) =>
                repo.updateTask(userId, Number(taskId), task).pipe(
                  Effect.matchEffect({
                    onFailure: () =>
                      Effect.sync(() =>
                        new ApiResponse(res, 404, `Task ${taskId} not found for user ${userId}`)
                      ),
                    onSuccess: (task) =>
                      Effect.sync(() =>
                        new ApiResponse(res, 200, "Task Updated", task)
                      ),
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

/**
 * Delete a task for a user
 */

const DeleteUserTaskRouteLive = Layer.scopedDiscard(
  Effect.gen(function* (_) {
    const app = yield* _(Express);
    const runFork = yield* _(FiberSet.makeRuntime<TaskRepository>());
    app.delete("/users/:user_id/tasks/:task_id", (req, res) => {
      const userId = req.params.user_id;
      const taskId = req.params.task_id as unknown as number;
      const program = TaskRepository.pipe(
        Effect.flatMap((repo) => repo.deleteTask(userId, Number(taskId))),
        Effect.matchEffect({
          onFailure: (error) =>
            Effect.sync(() => new ApiResponse(res, 400, error.message)),
          onSuccess: (message) => Effect.sync(() => new ApiResponse(res, 200, message)),
        
        })
      );
      runFork(program);
    });
  })
);
/**
 * Task Repository
 */

class TaskSchema extends Schema.Class<TaskSchema>("TaskSchema")({
  task_id: Schema.Number,
  user_id: Schema.String,
  name: Schema.String,
  status: Schema.String,
  description: Schema.String,
}) {}

const CreateTaskParams = TaskSchema.pipe(Schema.omit("task_id", "user_id"));
type CreateTaskParams = Schema.Schema.Type<typeof CreateTaskParams>;

const UpdateTaskParams = Schema.partial(
  TaskSchema.pipe(Schema.omit("task_id", "user_id"))
);
type UpdateTaskParams = Schema.Schema.Type<typeof UpdateTaskParams>;

const makeTaskRepository = Effect.gen(function* (_) {
  const tasksRef = yield* _(Ref.make(HashMap.empty<number, TaskSchema>()));

  const getTask = (id: number): Effect.Effect<Option.Option<TaskSchema>> =>
    Ref.get(tasksRef).pipe(Effect.map(HashMap.get(id)));

  const getTasks: Effect.Effect<ReadonlyArray<TaskSchema>> = Ref.get(
    tasksRef
  ).pipe(Effect.map((map) => Array.fromIterable(HashMap.values(map))));
  const getTasksByUser = (
    userId: string
  ): Effect.Effect< ReadonlyArray<TaskSchema > ,HTTPError> =>
    Ref.get(tasksRef).pipe(
      Effect.map((map) =>
        Array.fromIterable(HashMap.values(map)).filter(
          (task) => task.user_id === userId
        )
      )
    );
    const getTaskByUser = (
      userId: string,
      taskId: number
    ): Effect.Effect< Option.Option<TaskSchema> , HTTPError> =>
      Ref.get(tasksRef).pipe(
        Effect.map((map) => {
          const task = HashMap.get(map, Number(taskId));
          if (Option.isNone(task)) {
            return Option.none();
          }
          return task.value.user_id === userId ? task : Option.none();
        })
      );

    const createTask = (
      userId: string,
      params: CreateTaskParams
    ): Effect.Effect<string, HTTPError> => {
      const taskId = Math.ceil(Math.random() * 10000000000);
      const { description, name, status } = params;
      if(!name || !status || !description) {
        return Effect.fail(new HTTPError("Invalid Task", 400));
      }
      const newTask = new TaskSchema({
        task_id: taskId,
        user_id: userId,
        name,
        status,
        description,
      });
      return Ref.updateAndGet(tasksRef, (map) =>
        HashMap.set(map, taskId, newTask)
      ).pipe(Effect.map(() => taskId.toString()));
    };
  

  const updateTask = (
    userId: string,
    taskId: number,
    params: UpdateTaskParams
  ): Effect.Effect<TaskSchema ,HTTPError> =>
    Ref.get(tasksRef).pipe(
      Effect.flatMap((map) => {
        const task = HashMap.get(map, taskId);
        if (Option.isNone(task)) {
          return Effect.fail(new HTTPError(`Task ${taskId} not found`, 404));
        }
        if (task.value.user_id !== userId) {
          return Effect.fail(new HTTPError(`User ID does not match`, 400));
        }
        const updatedTask = new TaskSchema({ ...task.value, ...params });
        const updated = HashMap.set(map, Number(taskId), updatedTask);
        return Ref.set(tasksRef, updated).pipe(Effect.as(updatedTask));
      })
    );

   const deleteTask = (
    userId: string,
    taskId: number
  ): Effect.Effect<string, HTTPError> =>
    Ref.get(tasksRef).pipe(
      Effect.flatMap((map) => {
        const task = HashMap.get(map, taskId);
        if (Option.isNone(task)) {
          return Effect.fail(new HTTPError("Task not found", 404));
        }
        if (task.value.user_id !== userId) {
          return Effect.fail(new HTTPError("User ID is incorrect", 400));
        }
        return Ref.updateAndGet(tasksRef, (map) =>
          HashMap.remove(map, taskId)
        ).pipe(
          Effect.map(() => `Task ${taskId} deleted`)
        );
      })
    );
  return {
    getTask,
    getTasks,
    createTask,
    updateTask,
    getTasksByUser,
    getTaskByUser,
    deleteTask,
  } as const;
});
class TaskRepository extends Context.Tag("TaskRepository")<
  TaskRepository,
  Effect.Effect.Success<typeof makeTaskRepository>
>() {
  static readonly Live = Layer.effect(TaskRepository, makeTaskRepository);
}

const MainLive = ServerLive.pipe(
  Layer.merge(GetUserTaskRouteLive),
  Layer.merge(GetUserTasksRouteLive),
  Layer.merge(CreateUserTaskRouteLive),
  Layer.merge(UpdateUserTaskRouteLive),
  Layer.merge(DeleteUserTaskRouteLive),
  Layer.merge(CreateUserLive),
  Layer.provide(Express.Live),
  Layer.provide(TaskRepository.Live)
);

Layer.launch(MainLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.runFork
);
