import * as Schema from "@effect/schema/Schema";
import { Cause, Effect, HashMap, Option, Ref } from "effect";


export class TaskSchema extends Schema.Class<TaskSchema>("TaskSchema")({
  task_id: Schema.Number,
  user_id: Schema.Number, 
  name: Schema.String,
  status: Schema.String,
  description: Schema.String,
}) {}



export const CreateTaskParams =  TaskSchema.pipe(Schema.omit("task_id"));
 type CreateTaskParams = Schema.Schema.Type< typeof CreateTaskParams> ;

const UpdateTaskParams =   TaskSchema.pipe(Schema.omit("task_id"));
type UpdateTaskParams = Schema.Schema.Type<typeof UpdateTaskParams> & {user_id : number} ;

export const makeTaskRepository = Effect.gen(function* (_) {
  const nextIdRef = yield* _(Ref.make(0));
  const tasksRef = yield* _(Ref.make(HashMap.empty<number, TaskSchema>()));

  const getTask = (id: number): Effect.Effect<Option.Option<TaskSchema>> =>
    Ref.get(tasksRef).pipe(Effect.map(HashMap.get(id)));

  const getTasks: Effect.Effect<ReadonlyArray<TaskSchema>> = Ref.get(
    tasksRef
  ).pipe(Effect.map((map) => Array.from(HashMap.values(map))));

  const createTask = (params: CreateTaskParams , user_id : number): Effect.Effect<number> =>
    Ref.getAndUpdate(nextIdRef, (n) => n + 1).pipe(
      Effect.flatMap((task_id) =>
        Ref.modify(tasksRef, (map) => {
          const { status , name , description} = params;
          const newTask = new TaskSchema(  {  task_id ,user_id,name, status, description });
          const updated = HashMap.set(map, newTask.task_id, newTask);
          return [newTask.task_id, updated];
        })
      )
    );

  const updateTask = (
    id: number,
    params: UpdateTaskParams,
  ): Effect.Effect<TaskSchema, Cause.NoSuchElementException> =>
    Ref.get(tasksRef).pipe(
      Effect.flatMap((map) => {
        const maybeTask = HashMap.get(map, id);
        if (Option.isNone(maybeTask)) {
          return Effect.fail(new Cause.NoSuchElementException());
        }
        const newTask = new TaskSchema({ ...maybeTask.value, ...params });
        const updated = HashMap.set(map, id, newTask);
        return Ref.set(tasksRef, updated).pipe(Effect.as(newTask));
      })
    );

  const deleteTask = (id: number): Effect.Effect<boolean> =>
    Ref.get(tasksRef).pipe(
      Effect.flatMap((map) =>
        HashMap.has(map, id)
          ? Ref.set(tasksRef, HashMap.remove(map, id)).pipe(Effect.as(true))
          : Effect.succeed(false)
      )
    );

  return {
    getTask,
    getTasks,
    createTask,
    updateTask,
    deleteTask,
  };
});
