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
export const CreateUserLive = Layer.scopedDiscard(
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
/**
 * Get a task for a user
 */

const GetUserTaskRouteLive = Layer.scopedDiscard(
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
              onFailure: () => {
                return Effect.sync(() => new ApiResponse(res, 400, "Invalid Task"));
              },
              onSuccess: (task) => repo.createTask(userId, task).pipe(
                Effect.matchEffect({
                  onFailure: (error) => {
                    return Effect.sync(() => new ApiResponse(res, error.statusCode || 500, error.message));
                  },
                  onSuccess: (createdTask) => {
                    return Effect.sync(() => new ApiResponse(res, 200, "Task Created", createdTask));
                  },
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
 * Update a task for a user
 */
const UpdateUserTaskRouteLive = Layer.scopedDiscard(
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


/**
 * Delete a task for a user
 */

const DeleteUserTaskRouteLive = Layer.scopedDiscard(
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

/**
 * Task Repository
 */

class TaskSchema extends Schema.Class<TaskSchema>("TaskSchema")({
  task_id: Schema.Number,

  name: Schema.String,
  status: Schema.String,
  description: Schema.String,
}) {}

const CreateTaskParams = TaskSchema.pipe(Schema.omit("task_id"));
type CreateTaskParams = Schema.Schema.Type<typeof CreateTaskParams>;

const UpdateTaskParams = Schema.partial(
  TaskSchema.pipe(Schema.omit("task_id"))
);
type UpdateTaskParams = Schema.Schema.Type<typeof UpdateTaskParams>;

interface User {
  user_id: string;
  tasks: TaskSchema[];
}

const makeTaskRepository = Effect.gen(function* (_) {
  const tasksRef = yield* _(Ref.make(HashMap.empty<string, User>()));

  const getTask = (
    userId: string,
    taskId: number
  ): Effect.Effect<Option.Option<TaskSchema>> =>
    Ref.get(tasksRef).pipe(
      Effect.map((map) => {
        const user = HashMap.get(map, userId);
        if (Option.isNone(user)) return Option.none();
        return Option.fromNullable(
          user.value.tasks.find((task) => task.task_id === taskId)
        );
      })
    );

  const getTasksByUser = (
    userId: string
  ): Effect.Effect<ReadonlyArray<TaskSchema>, HTTPError> =>
    Ref.get(tasksRef).pipe(
      Effect.map((map) => {
        const user = HashMap.get(map, userId);
        if (Option.isNone(user)) return [];
        return user.value.tasks;
      })
    );
    const createTask = (
      userId: string,
      params: CreateTaskParams
    ): Effect.Effect<TaskSchema, HTTPError> => {
      const taskId = Math.ceil(Math.random() * 10000000000);
      const { description, name, status } = params;
    
      if (!name || !status || !description) {
        return Effect.fail(new HTTPError("Invalid Task", 400));
      }
    
      const newTask = new TaskSchema({
        task_id: taskId,

        name,
        status,
        description,
      });
    
      return Ref.get(tasksRef).pipe(
        Effect.flatMap((map) => {
          const user = HashMap.get(map, userId);
          if (Option.isNone(user)) {
            return Effect.fail(new HTTPError("User does not exist", 404));
          }
          return Ref.updateAndGet(tasksRef, (innerMap) => {
            const innerUser = HashMap.get(innerMap, userId);
            if (Option.isNone(innerUser)) {
              return innerMap; 
            }
            const updatedUser = {
              ...innerUser.value,
              tasks: [...innerUser.value.tasks, newTask]
            };
            return HashMap.set(innerMap, userId, updatedUser);
          }).pipe(
            Effect.flatMap(() => Effect.sync(() => newTask))
          );
        }),
        Effect.catchAll((error) => Effect.fail(error))
      );
    };
    
  const updateTask = (
    userId: string,
    taskId: number,
    params: UpdateTaskParams
  ): Effect.Effect<TaskSchema, HTTPError> =>
    Ref.updateAndGet(tasksRef, (map) => {
      const user = HashMap.get(map, userId);
      if (Option.isNone(user)) {
        return map; 
      }
      const taskIndex = user.value.tasks.findIndex((task) => task.task_id === taskId);
      if (taskIndex === -1) {
        return map; 
      }
      const task = user.value.tasks[taskIndex];
      const updatedTask = new TaskSchema({ ...task, ...params });
      const updatedTasks = [...user.value.tasks];
      updatedTasks[taskIndex] = updatedTask;
      const updatedUser = {
        ...user.value,
        tasks: updatedTasks
      };
      return HashMap.set(map, userId, updatedUser);
    }).pipe(
      Effect.flatMap((map) => {
        const user = HashMap.get(map, userId);
        if(Option.isNone(user) ){
          return Effect.fail(new HTTPError("User not found", 404));
        }
        const task = user.value.tasks.find((task) => task.task_id === taskId);
        if (task) {
          return Effect.sync(() => task);
        }
        return Effect.fail(new HTTPError(`Task ${taskId} not found`, 404));
      })
    );
  

  const deleteTask = (
    userId: string,
    taskId: number
  ): Effect.Effect<string, HTTPError> =>
    Ref.updateAndGet(tasksRef, (map) => {
      const user = HashMap.get(map, userId);
      if (Option.isNone(user)) {
        throw new HTTPError("Task not found", 404);
      }
      const updatedTasks = user.value.tasks.filter((task) => task.task_id !== taskId);
      if (updatedTasks.length === user.value.tasks.length) {
        throw new HTTPError("Task not found", 404);
      }
      const updatedUser = {
        ...user.value,
        tasks: updatedTasks
      };
      return HashMap.set(map, userId, updatedUser);
    }).pipe(
      Effect.flatMap(() => Effect.sync(() => `Task ${taskId} deleted`))
    );

  const createUser = (): Effect.Effect<User> => {
    const userId = uuidv4();
    const newUser = { user_id: userId, tasks: [] };
    return Ref.updateAndGet(tasksRef, (map) =>
      HashMap.set(map, userId, newUser)
    ).pipe(
      Effect.flatMap(() => Effect.sync(() => newUser))
    );
  };

  return {
    getTask,
    createTask,
    updateTask,
    getTasksByUser,
    deleteTask,
    createUser,
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
