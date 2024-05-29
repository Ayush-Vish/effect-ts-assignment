import { Context, Effect, HashMap, Layer, Option, Ref } from "effect";
import { v4 as uuidv4 } from "uuid";
import { HTTPError } from "../utils/util";
import {
  TaskSchema,
  CreateTaskParams,
  UpdateTaskParams,
} from "../models/model";
import { User } from "../models/model";

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
            tasks: [...innerUser.value.tasks, newTask],
          };
          return HashMap.set(innerMap, userId, updatedUser);
        }).pipe(Effect.flatMap(() => Effect.sync(() => newTask)));
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
      const taskIndex = user.value.tasks.findIndex(
        (task) => task.task_id === taskId
      );
      if (taskIndex === -1) {
        return map;
      }
      const task = user.value.tasks[taskIndex];
      const updatedTask = new TaskSchema({ ...task, ...params });
      const updatedTasks = [...user.value.tasks];
      updatedTasks[taskIndex] = updatedTask;
      const updatedUser = {
        ...user.value,
        tasks: updatedTasks,
      };
      return HashMap.set(map, userId, updatedUser);
    }).pipe(
      Effect.flatMap((map) => {
        const user = HashMap.get(map, userId);
        if (Option.isNone(user)) {
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
      const updatedTasks = user.value.tasks.filter(
        (task) => task.task_id !== taskId
      );
      if (updatedTasks.length === user.value.tasks.length) {
        throw new HTTPError("Task not found", 404);
      }
      const updatedUser = {
        ...user.value,
        tasks: updatedTasks,
      };
      return HashMap.set(map, userId, updatedUser);
    }).pipe(Effect.flatMap(() => Effect.sync(() => `Task ${taskId} deleted`)));

  const createUser = (): Effect.Effect<User> => {
    const userId = uuidv4();
    const newUser = { user_id: userId, tasks: [] };
    return Ref.updateAndGet(tasksRef, (map) =>
      HashMap.set(map, userId, newUser)
    ).pipe(Effect.flatMap(() => Effect.sync(() => newUser)));
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

export class TaskRepository extends Context.Tag("TaskRepository")<
  TaskRepository,
  Effect.Effect.Success<typeof makeTaskRepository>
>() {
  static readonly Live = Layer.effect(TaskRepository, makeTaskRepository);
}
